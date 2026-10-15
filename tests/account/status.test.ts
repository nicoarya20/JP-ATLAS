/** S0A-07: pure hold rules (heldKindOf) and the API gate body (accountGateResponse). */
import { describe, expect, test } from 'bun:test';
import { accountGateResponse } from '../../server/account/gate';
import { type AccountStatusFields, type HeldKind, heldKindOf } from '../../server/account/status';

const NOW = Date.parse('2026-10-16T00:00:00Z');
const HOUR = 3_600_000;

describe('heldKindOf', () => {
  const cases: Array<[string, AccountStatusFields, HeldKind | null]> = [
    ['approved', { approvalStatus: 'approved' }, null],
    ['pending', { approvalStatus: 'pending' }, 'pending'],
    ['rejected', { approvalStatus: 'rejected' }, 'rejected'],
    ['missing status fails closed as pending', {}, 'pending'],
    ['null status fails closed as pending', { approvalStatus: null }, 'pending'],
    ['unknown status fails closed as pending', { approvalStatus: 'suspended' }, 'pending'],
    [
      'permanent ban on an approved account',
      { approvalStatus: 'approved', banned: true },
      'banned',
    ],
    [
      'ban that expires later',
      { approvalStatus: 'approved', banned: true, banExpires: new Date(NOW + HOUR) },
      'banned',
    ],
    [
      'ban wins over pending',
      { approvalStatus: 'pending', banned: true, banExpires: new Date(NOW + HOUR) },
      'banned',
    ],
    [
      'ban wins over rejected',
      { approvalStatus: 'rejected', banned: true, banExpires: null },
      'banned',
    ],
    [
      'expired ban on an approved account passes',
      { approvalStatus: 'approved', banned: true, banExpires: new Date(NOW - HOUR) },
      null,
    ],
    [
      'expired ban does not lift a pending account',
      { approvalStatus: 'pending', banned: true, banExpires: new Date(NOW - HOUR) },
      'pending',
    ],
    ['banned=false is ignored', { approvalStatus: 'approved', banned: false }, null],
  ];

  test.each(cases)('%s', (_name, fields, expected) => {
    expect(heldKindOf(fields, NOW)).toBe(expected);
  });

  test('banExpires may be an ISO string', () => {
    const future = new Date(NOW + HOUR).toISOString();
    expect(heldKindOf({ approvalStatus: 'approved', banned: true, banExpires: future }, NOW)).toBe(
      'banned',
    );
  });
});

describe('accountGateResponse', () => {
  test('pending → ACCOUNT_PENDING, in Indonesian', () => {
    const body = accountGateResponse({ kind: 'pending' });
    expect(body?.code).toBe('ACCOUNT_PENDING');
    expect(body?.error).toContain('menunggu persetujuan');
  });

  test('rejected → ACCOUNT_REJECTED', () => {
    expect(accountGateResponse({ kind: 'rejected' })?.code).toBe('ACCOUNT_REJECTED');
  });

  test('banned has no 403 code of its own (X3 M18)', () => {
    expect(accountGateResponse({ kind: 'banned' })).toBeNull();
  });
});
