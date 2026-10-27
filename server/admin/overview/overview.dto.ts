/**
 * Wire shape of `GET /api/admin/overview` (P11 AD-14). Type-only and browser-safe (no DB import):
 * the loader, the API and the six widgets all read the same shapes. Every section is a `Widget`, so
 * one failing aggregate shows "Coba lagi" on its own card instead of blanking the Admin Beranda.
 *
 * It follows `server/home/home.dto.ts` on purpose: the Beranda produk already answers a whole screen
 * in one soft-failing call, and the Admin Beranda is the same idea scoped to the workspace.
 */
import type { IsoDate } from '../../metrics/types';
import type { EventKind, ProjectStatus } from '../../pm/enums';
import type { Role } from '../../permissions';

/** A section that loaded, or one that failed softly (the cause is logged server-side, never sent). */
export type Widget<T> = { ok: true; data: T } | { ok: false };

/** "Now" of the request in the team zone; "today" (for overdue) comes from here, never from the browser. */
export type OverviewNow = {
  iso: string;
  today: IsoDate;
  timeZone: string;
};

/** Registrants still waiting to be let in — the one card that was already real before AD-14. */
export type PendingApprovals = { count: number };

/** Headcount by effective role among accounts that can sign in today, plus how many are suspended. */
export type MembersSummary = {
  /** Accounts that are not banned (legacy `user`/null roles read as member). */
  active: number;
  /** Suspended accounts; kept apart so the card can say why a total is lower than expected. */
  inactive: number;
  roles: Array<{ role: Role; count: number }>;
};

/** Live projects grouped by their status, so an Admin sees what is running vs. stalled at a glance. */
export type ProjectsSummary = {
  total: number;
  byStatus: Array<{ status: ProjectStatus; count: number }>;
};

/** A task that is past its due date and still open, with who holds it. */
export type OverdueTask = {
  id: string;
  number: number;
  title: string;
  projectName: string;
  /** Null when the account was removed (SET NULL) or the task was never assigned. */
  assigneeName: string | null;
  dueDate: IsoDate;
  /** Whole calendar days past the due date, in the team zone. */
  overdueDays: number;
};

export type OverdueTasksSummary = { items: OverdueTask[]; total: number };

/** An upcoming (or in-progress) event anywhere in the workspace, soonest first. */
export type AgendaEvent = {
  id: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string;
  /** Null for a personal event that belongs to no project. */
  projectName: string | null;
};

export type AgendaSummary = { items: AgendaEvent[]; total: number };

/** A recent role change read from the audit trail; names come from one join, never a query per row. */
export type RoleChange = {
  id: string;
  /** Who was re-roled; email is the fallback label when the account has no display name. */
  targetName: string | null;
  targetEmail: string | null;
  /** Stored verbatim in the audit meta; a legacy `user` or a missing value stays as-is for the label. */
  from: string | null;
  to: string | null;
  /** Who made the change. */
  byName: string | null;
  byEmail: string | null;
  at: string;
};

export type RoleChangesSummary = { items: RoleChange[] };

/** Everything the Admin Beranda shows, each section soft-failing on its own. */
export type OverviewData = {
  now: OverviewNow;
  pending: Widget<PendingApprovals>;
  members: Widget<MembersSummary>;
  projects: Widget<ProjectsSummary>;
  overdue: Widget<OverdueTasksSummary>;
  agenda: Widget<AgendaSummary>;
  roles: Widget<RoleChangesSummary>;
};
