import { describe, expect, it } from 'bun:test';
import {
  actionMeta,
  buildAuditQuery,
  DEFAULT_AUDIT_FILTERS,
  hasActiveAuditFilters,
} from '../app/lib/audit-api';
import { AUDIT_ACTIONS } from '../server/audit';

describe('audit-api helpers', () => {
  it('buildAuditQuery and hasActiveAuditFilters', () => {
    expect(buildAuditQuery({ ...DEFAULT_AUDIT_FILTERS, page: 1, limit: 25 }).toString()).toBe(
      'page=1&limit=25',
    );
    const q = buildAuditQuery({
      ...DEFAULT_AUDIT_FILTERS,
      action: 'user.ban',
      targetType: 'user',
      actorId: 'a',
      period: '7',
    });
    expect(q.get('action')).toBe('user.ban');
    expect(q.get('days')).toBe('7');
    expect(hasActiveAuditFilters(DEFAULT_AUDIT_FILTERS)).toBe(false);
    expect(hasActiveAuditFilters({ ...DEFAULT_AUDIT_FILTERS, actorId: 'a' })).toBe(true);
  });
  it('actionMeta labels known actions and falls back to the raw verb', () => {
    expect(actionMeta('user.delete')).toEqual({ label: 'Hapus user', color: 'red' });
    expect(actionMeta('custom.thing').label).toBe('custom.thing');
  });
  it('labels every action the server can write (P14 CU-03 renamed the leave ones)', () => {
    for (const action of Object.values(AUDIT_ACTIONS))
      expect(actionMeta(action).label).not.toBe(action);
    expect(actionMeta('leave.set').label).toBe('Catat cuti');
    expect(actionMeta('leave.clear').label).toBe('Akhiri cuti');
    // The four actions of the old approval flow are gone from both sides.
    for (const stale of ['leave.approve', 'leave.reject', 'leave.cancel', 'settings.leave.update'])
      expect(actionMeta(stale).label).toBe(stale);
  });
});
