/**
 * Pure event policy: who may see, create, change, cancel, trash, annotate and restore an
 * event (R08 §3.1, P6 §5/§6 E-02, Q7, Q9). Logic only: no storage or runtime globals, so the
 * same functions gate the API and the UI buttons.
 *
 * An event is reachable along four paths, mirroring the list SQL in `server/event/events.access.ts`:
 * Admin, its creator, its guest list, or the project it belongs to. A personal event (no project)
 * therefore has no level at all, so a Project Manager's read-everything rule (P-A1) does not reach
 * someone else's private appointment.
 */
import { METRICS } from '../metrics/config';
import { isRestorable } from '../metrics/trash.metrics';
import type { MetricsConfig } from '../metrics/types';
import { allow, type Decision, deny } from './decision';
import { atLeast, type Level, levelOf } from './level';
import { type NotVisible, notVisible } from './not-visible';
import { ACCESS_RULES, type AccessRules } from './rules';
import type { EventSubject, Membership, Principal, ProjectSubject } from './types';

// `NOT_VISIBLE` is deliberately outside `DENY_CODES`: it is reported as 404 so a hidden event looks
// the same as a missing one (D8), the same contract the project policy uses.
/** A `Decision` that may also carry `NOT_VISIBLE` (HTTP 404, the viewer may not know the event exists). */
export type EventDecision = Decision | NotVisible<'NOT_VISIBLE'>;

/** Shared and frozen: returned as-is so callers cannot mutate the next decision. */
export const NOT_VISIBLE: Readonly<NotVisible<'NOT_VISIBLE'>> = notVisible('NOT_VISIBLE');

/**
 * The principal's level on the event's project. An Admin outranks any project role (K6);
 * a personal event has no project, so it yields `none` and the creator/guest paths decide alone.
 */
export function eventLevel(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): Level {
  const level = levelOf(p, m, rules);
  if (level === 'admin') return 'admin';
  return event.projectId === null ? 'none' : level;
}

/** Whether `p` is the creator or on the guest list: the two paths that need no project at all. */
function isOwnEvent(p: Principal, event: EventSubject): boolean {
  return event.createdBy === p.id || event.isParticipant;
}

/**
 * Whether `p` may open the event read-only. Any project role including Pemantau may read a
 * project event, and a non-member Project Manager may too while P-A1 is on (Q7); everyone else
 * needs to be its creator or a guest. Anyone without a path gets 404, not 403 (D8).
 */
export function canViewEvent(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  // The event's trash state is not checked here: the Trash page must still open what it lists.
  if (atLeast(eventLevel(p, event, m, rules), 'reader')) return allow();
  return isOwnEvent(p, event) ? allow() : NOT_VISIBLE;
}

/**
 * Whether `p` may create an event. A personal event is open to every signed-in user; attaching
 * one to a project needs at least `member` there, so a Pemantau is told they are not a member
 * (the key case of P6 §6 E-02) and a project in the Trash must be restored first.
 */
export function canCreateEvent(
  p: Principal,
  project: ProjectSubject | null,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  if (project === null) return allow();
  const level = levelOf(p, m, rules);
  if (level === 'none') return NOT_VISIBLE;
  // Catches both Pemantau and the non-member Project Manager: reading a project is not joining it.
  if (!atLeast(level, 'member')) return deny('NOT_MEMBER');
  // The project's own status does not matter: a finished project may still be met about (Q12).
  return project.deletedAt ? deny('PROJECT_IN_TRASH') : allow();
}

/** An event in the Trash, or whose project is, is frozen: only restore is allowed. */
export function eventOpen(event: EventSubject): Decision {
  if (event.projectDeletedAt) return deny('PROJECT_IN_TRASH');
  if (event.deletedAt) return deny('WRONG_STATE');
  return allow();
}

/**
 * Whether `p` may change the event: Admin, its creator, or a manager of its project. The view
 * check runs first so a hidden event stays hidden, and the Trash freeze runs last so the message
 * a visible event gives is about its state, not about the role.
 */
export function canManageEvent(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  const view = canViewEvent(p, event, m, rules);
  if (!view.ok) return view;
  const level = eventLevel(p, event, m, rules);
  // A guest is not an editor: being on the list grants reading and writing minutes, nothing more.
  if (!atLeast(level, 'manager') && event.createdBy !== p.id) return deny('NOT_MANAGER');
  return eventOpen(event);
}

/**
 * Whether `p` may cancel the event. Cancelling notifies every guest and cannot be undone by them,
 * so it is barred while a super-admin is impersonating (Q9). Re-cancelling is rejected as a stale
 * state; whether a *reason* was given is validated by the service, not here.
 */
export function canCancelEvent(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  const manage = canManageEvent(p, event, m, rules);
  if (!manage.ok) return manage;
  return event.canceledAt ? deny('WRONG_STATE') : allow();
}

/** Whether `p` may move the event to the Trash; destructive, so impersonation is checked first (Q9). */
export function canTrashEvent(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  return canManageEvent(p, event, m, rules);
}

/** Whether `p` may add or remove guests: the same people who may change the event. */
export function canManageParticipants(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  return canManageEvent(p, event, m, rules);
}

/**
 * Whether `p` may write the minutes: a guest, the creator, a manager of its project, or Admin.
 * Attending is enough — the person who took the notes is usually not the organiser.
 * Whether a *cancelled* event still accepts minutes is E-05's call, since it needs an API code
 * of its own (`EVENT_CANCELED`) rather than a `DenyCode`.
 */
export function canWriteNote(
  p: Principal,
  event: EventSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): EventDecision {
  const view = canViewEvent(p, event, m, rules);
  if (!view.ok) return view;
  const level = eventLevel(p, event, m, rules);
  if (!atLeast(level, 'manager') && !isOwnEvent(p, event)) return deny('NOT_MEMBER');
  return eventOpen(event);
}

/**
 * Whether `p` may bring a trashed event back: Admin, its creator or a manager of its project,
 * while it is still within the retention period and its project is not itself in the Trash.
 * Blocked while impersonating (Q9), like restoring a project.
 */
export function canRestoreEvent(
  p: Principal,
  event: EventSubject,
  m: Membership,
  now: Date,
  rules: AccessRules = ACCESS_RULES,
  metrics: MetricsConfig = METRICS,
): EventDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  const view = canViewEvent(p, event, m, rules);
  if (!view.ok) return view;
  const level = eventLevel(p, event, m, rules);
  if (!atLeast(level, 'manager') && event.createdBy !== p.id) return deny('NOT_MANAGER');
  if (!event.deletedAt) return deny('WRONG_STATE');
  // Restoring into a trashed project would make the event unreachable again; restore the project first.
  if (event.projectDeletedAt) return deny('PROJECT_IN_TRASH');
  return isRestorable(event.deletedAt, now, metrics) ? allow() : deny('EXPIRED');
}
