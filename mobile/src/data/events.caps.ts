/**
 * Reading the server's `can{}` for one event. Mobile has no permission rules of its own: the three
 * states below are the whole of it (`server/access/capabilities.ts` `capOf`).
 *
 * - key absent  → the control is **hidden** (fail closed; that is what a hidden event gives too);
 * - `true`      → the control is **enabled**;
 * - a deny code → the control is **shown disabled**, with the server's reason.
 *
 * The reasons are the server's own Indonesian sentences, copied from `server/access/decision.ts`
 * because mobile cannot import `server/` (map GAP-A12). K5 says server sentences are shown as they
 * come, so they are not translated. `__tests__/events/events.caps.test.ts` reads that file as text
 * and fails when a sentence here drifts from it.
 *
 * Only the codes an event capability can actually carry are listed: every other `DenyCode` an
 * event policy returns is `ui: 'hide'`, which the server turns into an absent key before it leaves.
 * An unknown code therefore hides the control, the same way the server does.
 */
import type { CapValue, EventCapKey, EventCapsWire } from './events.wire';

/** How a control backed by a capability is drawn. */
export type CapState = 'hidden' | 'enabled' | 'disabled';

/** Deny codes an event capability can carry, with the server's reason for each. */
export const EVENT_DENY_MESSAGES: Record<string, string> = {
  IMPERSONATING:
    'Aksi ini dinonaktifkan selama kamu menyamar sebagai pengguna lain. Akhiri penyamaran dulu.',
  PROJECT_IN_TRASH: 'Proyeknya ada di Sampah. Pulihkan proyeknya dulu.',
};

/** The state of one capability value. An unrecognised code hides the control, as the server does. */
export function capState(cap: CapValue | undefined): CapState {
  if (cap === undefined) return 'hidden';
  if (cap === true) return 'enabled';
  return EVENT_DENY_MESSAGES[cap] ? 'disabled' : 'hidden';
}

/** The reason a capability is disabled, or null when it is enabled or hidden. */
export function capReason(cap: CapValue | undefined): string | null {
  return typeof cap === 'string' ? (EVENT_DENY_MESSAGES[cap] ?? null) : null;
}

/** True only when the server says the action may be taken now. */
export const capAllows = (cap: CapValue | undefined): boolean => cap === true;

/** The state of one key of an event's `can{}`. */
export const eventCap = (can: EventCapsWire, key: EventCapKey): CapState => capState(can[key]);

/** True when the control for `key` should be drawn at all (enabled or disabled with a reason). */
export const eventCapShown = (can: EventCapsWire, key: EventCapKey): boolean =>
  eventCap(can, key) !== 'hidden';

/** True when `key` may be used now; this is what a button's `onPress` is allowed to rely on. */
export const eventCapAllows = (can: EventCapsWire, key: EventCapKey): boolean =>
  capAllows(can[key]);

/** The reason `key` is disabled, for the hint under a shown-but-disabled control. */
export const eventCapReason = (can: EventCapsWire, key: EventCapKey): string | null =>
  capReason(can[key]);
