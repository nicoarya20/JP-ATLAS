/**
 * The session payload, read defensively into `SessionUser`.
 *
 * Better Auth's client revives dates while parsing, so `banExpires` arrives as a Date on one
 * response and a string on another; and a field the server stopped sending must not crash the
 * gate. Anything missing or of the wrong type becomes null — which `statusOfUser` then treats as
 * "not approved", so a payload this app cannot read keeps someone out rather than letting them in.
 */
import type { SessionUser } from './session.state';

type Raw = Record<string, unknown>;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const isoDate = (value: unknown): string | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return text(value);
};

/** The `user` of a session payload, or null when there is no usable one (nobody is signed in). */
export function toSessionUser(payload: unknown): SessionUser | null {
  const session = (typeof payload === 'object' && payload !== null ? payload : {}) as Raw;
  const raw = (
    typeof session.user === 'object' && session.user !== null ? session.user : {}
  ) as Raw;
  const id = text(raw.id);
  const email = text(raw.email);
  // Without an id and an email there is nothing to act as; treat it as signed out.
  if (!id || !email) return null;
  return {
    id,
    email,
    name: text(raw.name) ?? email,
    image: text(raw.image),
    approvalStatus: text(raw.approvalStatus),
    approvalReason: text(raw.approvalReason),
    banned: raw.banned === true,
    banReason: text(raw.banReason),
    banExpires: isoDate(raw.banExpires),
  };
}
