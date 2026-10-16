/** canRestoreProject (S1-05): any manager of the project or Admin, within TRASH_RETENTION_DAYS, never while impersonating. */
import { describe, expect, it } from 'bun:test';
import type { ProjectDecision } from '../../server/access/project.policy';
import { canRestoreProject, canTrashProject } from '../../server/access/project.policy';
import { ACCESS_RULES } from '../../server/access/rules';
import type { ProjectSubject } from '../../server/access/types';
import { METRICS } from '../../server/metrics/config';
import { PM_ERRORS } from '../../server/pm/errors';
import { PERSONA_CODES, type PersonaCode, persona } from './fixtures';

// test-only: deleted 1 Oct 10:00 WIB; "now" is 7 Oct (day 7 of 30).
const DELETED_AT = new Date('2026-10-01T03:00:00Z');
const NOW = new Date('2026-10-07T03:00:00Z');
const TRASHED: ProjectSubject = {
  id: 'P-atlas',
  status: 'active',
  leadId: 'U-nico',
  deletedAt: DELETED_AT,
  deletedBy: 'U-nico',
};

const code = (d: ProjectDecision) => (d.ok ? 'allow' : d.code);

// Restore: Admins and every manager (Member-manager included, D1); Observers and Members cannot.
const RESTORE: Record<PersonaCode, string> = {
  SA: 'allow',
  AD: 'allow',
  'PM-K': 'allow',
  'PM-X': 'NOT_MANAGER',
  'M-K': 'allow',
  AG: 'NOT_MANAGER',
  PT: 'NOT_MANAGER',
  BA: 'NOT_VISIBLE',
};

describe('canRestoreProject', () => {
  it.each([...PERSONA_CODES])('%s: restore within the retention period', (c) => {
    const { principal, membership } = persona(c);
    expect(code(canRestoreProject(principal, TRASHED, membership, NOW))).toBe(RESTORE[c]);
  });

  it('lets the Member-manager restore what she may not trash (15 Oct 2026 decision)', () => {
    const { principal, membership } = persona('M-K');
    const live = { ...TRASHED, deletedAt: null, deletedBy: null };
    expect(code(canTrashProject(principal, live, membership))).toBe('ROLE_CANNOT_TRASH');
    expect(code(canRestoreProject(principal, TRASHED, membership, NOW))).toBe('allow');
  });

  it('answers EXPIRED (410) on day 31 and allows the last minute of day 30', () => {
    const { principal, membership } = persona('PM-K');
    const day30 = new Date('2026-10-30T16:59:59Z'); // 30 Oct 23:59:59 WIB
    const day31 = new Date('2026-10-30T17:00:00Z'); // 31 Oct 00:00 WIB
    expect(code(canRestoreProject(principal, TRASHED, membership, day30))).toBe('allow');
    expect(code(canRestoreProject(principal, TRASHED, membership, day31))).toBe('EXPIRED');
    expect(PM_ERRORS.EXPIRED.http).toBe(410);
  });

  it('reads the retention period from the injected config', () => {
    const { principal, membership } = persona('AD');
    const short = { ...METRICS, TRASH_RETENTION_DAYS: 3 };
    expect(code(canRestoreProject(principal, TRASHED, membership, NOW, ACCESS_RULES, short))).toBe(
      'EXPIRED',
    );
  });

  it('refuses a project that is not in the Trash with WRONG_STATE', () => {
    const { principal, membership } = persona('PM-K');
    const live = { ...TRASHED, deletedAt: null, deletedBy: null };
    expect(code(canRestoreProject(principal, live, membership, NOW))).toBe('WRONG_STATE');
  });

  it('refuses everyone while impersonating, before anything else (Q9)', () => {
    for (const c of PERSONA_CODES) {
      const { principal, membership } = persona(c);
      const as = { ...principal, impersonating: true };
      expect(code(canRestoreProject(as, TRASHED, membership, NOW))).toBe('IMPERSONATING');
    }
  });
});
