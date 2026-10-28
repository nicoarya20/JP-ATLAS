/**
 * Who is signed in, as the data layer needs them, and the one way to ask "is this row theirs?" (K4).
 *
 * The prototype matched people by **first name**: a task was mine when `task.who === 'Nico'`. That
 * works in a sample with six people and breaks the first time two of them are called Budi — and it
 * breaks silently, by attaching work to the wrong person, which no error will ever report. The
 * server has always worked in `userId`.
 *
 * So identity comes from the session (`user.id`) and names are for display only. While the modules
 * still read the sample rows, those rows carry names, so `samePerson` resolves a reference to one
 * person before comparing — and that resolution is the seam: when a module starts reading a server
 * DTO, the reference it passes is already a `userId` and `samePerson` matches it directly, with
 * nothing else to change.
 *
 * **Module contract (W3): match people only through `samePerson` / `someSamePerson`.** Do not write
 * a name comparison of your own, and do not compare `userId` by hand either — when your module
 * moves to the server's DTO, this is the single place that has to learn about it.
 *
 * The role is still the prototype's default (`SESSION_ROLE`): the session payload from
 * `/api/auth/get-session` carries no role, and the app's own role source is `AppCaps` on
 * `/api/app`, which K6 approved but nothing has built yet. It is a parameter everywhere for that
 * reason — see `mobile/docs/phase2-gap-disembunyikan.md`.
 */
import { sessionStore } from '@/session/session.state';

import { me, type PersonInfo, person } from './people';
import type { Role } from './sample';
import { SESSION_ROLE } from './session';
import { useStore } from './store';

export type Viewer = {
  /** The account id the session reports: the identity, and the only thing worth matching on. */
  userId: string;
  /** For display. Two people may share it — which is exactly why it is not the identity. */
  name: string;
  /** Full name, for a profile header. */
  full: string;
  /** What the screens may offer. */
  role: Role;
  /**
   * The sample person this account stands in for, while the data modules still read sample rows.
   * W3 replaces it with the person fields of the server's DTO, module by module.
   */
  sample: PersonInfo;
};

/** A person as a data row refers to them: a `userId` from the server, or a name in a sample row. */
export type PersonRef = string | null | undefined;

/**
 * Enough of a person to match rows against: the id the server knows them by, and the sample person
 * behind it while the rows still carry names. A `Viewer` is one of these.
 */
export type PersonIdentity = { userId: string; sample: PersonInfo };

/**
 * A viewer standing in for `sample`, with the session's account id. The sample key stands in only
 * when there is no session at all, which is a test rendering a screen on its own; inside the app
 * the gate guarantees a user.
 */
const viewerFrom = (userId: string | undefined, sample: PersonInfo, role: Role): Viewer => ({
  userId: userId ?? sample.key,
  name: sample.name,
  full: sample.full,
  role,
  sample,
});

/**
 * The signed-in person. `role` stays a parameter so every screen can still be rendered as any role
 * in tests; the identity is the session's either way.
 */
export const viewer = (role: Role = SESSION_ROLE): Viewer =>
  viewerFrom(sessionStore.get().user?.id, me(role), role);

/** The signed-in person in a component, re-rendering if the account changes. */
export function useViewer(role: Role = SESSION_ROLE): Viewer {
  const userId = useStore(sessionStore, (s) => s.user?.id);
  return viewerFrom(userId, me(role), role);
}

/**
 * The identity of a sample person, for a caller that still has one in hand (a screen that has
 * already looked up `me(role)`). The account id comes from the session, as everywhere else.
 *
 * W3: this exists so the screens did not have to change in W2. When your module
 * moves to the server's DTO, let the data module call `viewer(role)` itself and drop the argument.
 */
export const viewerOf = (sample: PersonInfo, role: Role = SESSION_ROLE): Viewer =>
  viewerFrom(sessionStore.get().user?.id, sample, role);

/** Whether a reference in a data row points at `who`. The only person comparison in the app. */
export function samePerson(ref: PersonRef, who: PersonIdentity): boolean {
  if (!ref) return false;
  // A server DTO already gives the identity; nothing to resolve.
  if (ref === who.userId) return true;
  // A sample row gives a person key or a first name. Both sides become a key before comparing, so
  // "Nico" and "nico" are the same person and an unknown name is nobody rather than a near miss.
  return person(ref)?.key === who.sample.key;
}

/** Whether any of the references points at `who` (a task's assignees, an event's attendees). */
export const someSamePerson = (refs: readonly PersonRef[], who: PersonIdentity): boolean =>
  refs.some((ref) => samePerson(ref, who));

/**
 * The identity of someone who is not the signed-in person (a teammate whose load is being counted).
 * Their sample key stands in for the `userId` the server would send, which is what W3
 * replaces it with.
 */
export const identityOf = (sample: PersonInfo): PersonIdentity => ({ userId: sample.key, sample });

/** The identity of the person a row names, or null when it names nobody we know. */
export const identityRef = (ref: PersonRef): PersonIdentity | null => {
  const found = ref ? person(ref) : undefined;
  return found ? identityOf(found) : null;
};
