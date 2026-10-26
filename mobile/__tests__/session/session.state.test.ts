/**
 * The rules the gate decides by: which status a session payload proves, which one an API failure
 * proves, and how a payload the app cannot read is treated (as not approved, never as approved).
 */
import { ApiError, CLIENT_CODES } from '@/api';
import {
  applyApiError,
  isBanned,
  type SessionUser,
  sessionStore,
  setSessionUser,
  statusFromApiError,
  statusOfUser,
  toSessionUser,
} from '@/session';

import { APPROVED_USER, PENDING_USER, REJECTED_USER } from '../helpers/session-fixtures';

const DAY_MS = 86_400_000;
const banned = (over: Partial<SessionUser> = {}): SessionUser => ({
  ...APPROVED_USER,
  banned: true,
  ...over,
});

describe('statusOfUser', () => {
  it('is signed out with no session at all', () => {
    expect(statusOfUser(null)).toBe('signed-out');
  });

  it('lets an approved account into the app', () => {
    expect(statusOfUser(APPROVED_USER)).toBe('signed-in');
  });

  it('holds a pending account and a rejected one apart', () => {
    expect(statusOfUser(PENDING_USER)).toBe('pending');
    expect(statusOfUser(REJECTED_USER)).toBe('rejected');
  });

  it('counts an unknown or missing approval as pending, so an odd payload fails closed', () => {
    expect(statusOfUser({ ...APPROVED_USER, approvalStatus: null })).toBe('pending');
    expect(statusOfUser({ ...APPROVED_USER, approvalStatus: 'APPROVED' })).toBe('pending');
    expect(statusOfUser({ ...APPROVED_USER, approvalStatus: 'whatever' })).toBe('pending');
  });

  it('treats a suspension like a signed-out caller, as the server does', () => {
    expect(statusOfUser(banned())).toBe('signed-out');
    expect(statusOfUser(banned({ banExpires: new Date(Date.now() + DAY_MS).toISOString() }))).toBe(
      'signed-out',
    );
  });

  it('ignores a suspension that has already lifted', () => {
    const lifted = banned({ banExpires: new Date(Date.now() - DAY_MS).toISOString() });
    expect(isBanned(lifted)).toBe(false);
    expect(statusOfUser(lifted)).toBe('signed-in');
  });
});

describe('statusFromApiError', () => {
  const error = (code: string, status: number) => new ApiError({ message: 'x', code, status });

  it('reads the 403 codes a held account gets from /api/app', () => {
    expect(statusFromApiError(error('ACCOUNT_PENDING', 403))).toBe('pending');
    expect(statusFromApiError(error('ACCOUNT_REJECTED', 403))).toBe('rejected');
  });

  it('reads a 401 as nobody being signed in, whatever code came with it', () => {
    expect(statusFromApiError(error('UNAUTHORIZED', 401))).toBe('signed-out');
    expect(statusFromApiError(error('SOMETHING_ELSE', 401))).toBe('signed-out');
  });

  it('says nothing about the session for an unrelated failure', () => {
    expect(statusFromApiError(error('NOT_FOUND', 404))).toBeNull();
    expect(statusFromApiError(error('FORBIDDEN', 403))).toBeNull();
  });

  it('says nothing for a request that never arrived — it proves nothing either way', () => {
    expect(statusFromApiError(error(CLIENT_CODES.NETWORK, 0))).toBeNull();
    expect(statusFromApiError(error(CLIENT_CODES.TIMEOUT, 0))).toBeNull();
  });
});

describe('applyApiError', () => {
  beforeEach(() => setSessionUser(APPROVED_USER));

  it('moves an approved session to pending when the server says the account is held', () => {
    expect(
      applyApiError(new ApiError({ message: 'x', code: 'ACCOUNT_PENDING', status: 403 })),
    ).toBe('pending');
    expect(sessionStore.get().status).toBe('pending');
    // The account stays on record: the waiting screen still has an address to show.
    expect(sessionStore.get().user?.email).toBe(APPROVED_USER.email);
  });

  it('clears the session on a 401, leaving nothing of the account behind', () => {
    expect(applyApiError(new ApiError({ message: 'x', code: 'UNAUTHORIZED', status: 401 }))).toBe(
      'signed-out',
    );
    expect(sessionStore.get()).toMatchObject({ status: 'signed-out', user: null, clock: null });
  });

  it('leaves the session alone when the failure proves nothing', () => {
    expect(
      applyApiError(new ApiError({ message: 'x', code: 'NOT_FOUND', status: 404 })),
    ).toBeNull();
    expect(sessionStore.get().status).toBe('signed-in');
  });
});

describe('toSessionUser', () => {
  it('reads the fields the gate needs out of a session payload', () => {
    const user = toSessionUser({
      user: { id: 'u1', email: 'a@b.id', name: 'A B', approvalStatus: 'approved' },
    });
    expect(user).toMatchObject({ id: 'u1', email: 'a@b.id', name: 'A B', banned: false });
  });

  it('is null without a session, and without the two fields an account needs', () => {
    expect(toSessionUser(null)).toBeNull();
    expect(toSessionUser({})).toBeNull();
    expect(toSessionUser({ user: { email: 'a@b.id' } })).toBeNull();
    expect(toSessionUser({ user: { id: 'u1' } })).toBeNull();
  });

  it('falls back to the address when there is no name to show', () => {
    expect(toSessionUser({ user: { id: 'u1', email: 'a@b.id', name: '  ' } })?.name).toBe('a@b.id');
  });

  it('takes banExpires whether the client revived it as a Date or left it a string', () => {
    const iso = new Date(Date.now() + DAY_MS).toISOString();
    expect(
      toSessionUser({ user: { id: 'u1', email: 'a@b.id', banExpires: new Date(iso) } })?.banExpires,
    ).toBe(iso);
    expect(
      toSessionUser({ user: { id: 'u1', email: 'a@b.id', banExpires: iso } })?.banExpires,
    ).toBe(iso);
    expect(
      toSessionUser({ user: { id: 'u1', email: 'a@b.id', banExpires: 12 } })?.banExpires,
    ).toBeNull();
  });

  it('a payload it cannot read is not approved', () => {
    expect(statusOfUser(toSessionUser({ user: { id: 'u1', email: 'a@b.id' } }))).toBe('pending');
  });
});
