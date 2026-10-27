/**
 * The two rules that make the shared audit trail readable by a non-technical admin (P11 AD-18):
 * the explicit whitelist (only admin-comprehensible actions, never the technical ones) and the
 * server-side email masking. Pure functions, no DB.
 */
import { describe, expect, test } from 'bun:test';
import {
  actionsOfCategory,
  ADMIN_ACTIVITY_ACTIONS,
  ADMIN_ACTIVITY_CATEGORIES,
  isAdminActivityAction,
  maskEmail,
} from '../server/audit.admin';
import { AUDIT_ACTIONS } from '../server/audit';
import { actionMeta } from '../app/lib/audit-api';

describe('the whitelist', () => {
  const whitelisted = new Set<string>(ADMIN_ACTIVITY_ACTIONS);

  test('admits the five things an admin needs to answer "who did this?"', () => {
    for (const a of [
      AUDIT_ACTIONS.USER_APPROVE,
      AUDIT_ACTIONS.USER_REJECT,
      AUDIT_ACTIONS.USER_ROLE_SET,
      AUDIT_ACTIONS.SETTINGS_BRANDING_UPDATE,
      AUDIT_ACTIONS.SETTINGS_AUTH_UPDATE,
      AUDIT_ACTIONS.SETTINGS_FEATURES_UPDATE,
      AUDIT_ACTIONS.PROJECT_TRASH,
      AUDIT_ACTIONS.PROJECT_RESTORE,
      AUDIT_ACTIONS.DATA_EXPORT,
    ]) {
      expect(whitelisted.has(a)).toBe(true);
    }
  });

  test('keeps the technical server actions out', () => {
    for (const a of [
      AUDIT_ACTIONS.LOGS_PURGE,
      AUDIT_ACTIONS.LOGS_DELETE,
      AUDIT_ACTIONS.APIKEY_CREATE,
      AUDIT_ACTIONS.APIKEY_REVOKE,
      AUDIT_ACTIONS.SESSION_REVOKE,
      AUDIT_ACTIONS.SETTINGS_RATE_LIMIT_UPDATE,
      AUDIT_ACTIONS.SETTINGS_MAINTENANCE_UPDATE,
      AUDIT_ACTIONS.SETTINGS_DEMO_UPDATE,
      AUDIT_ACTIONS.OPS_RESET,
      AUDIT_ACTIONS.USER_IMPERSONATE,
      AUDIT_ACTIONS.POST_DELETE,
      AUDIT_ACTIONS.TASK_TRASH,
      AUDIT_ACTIONS.EVENT_TRASH,
      AUDIT_ACTIONS.PROJECT_CONDITION_SET,
      AUDIT_ACTIONS.TRASH_RETENTION,
      AUDIT_ACTIONS.LEAVE_SET,
    ]) {
      expect(whitelisted.has(a)).toBe(false);
    }
  });

  test('every whitelisted action has an Indonesian label, never a raw code', () => {
    for (const a of ADMIN_ACTIVITY_ACTIONS) {
      expect(actionMeta(a).label).not.toBe(a);
    }
  });

  test('isAdminActivityAction guards the action parameter against a bypass', () => {
    expect(isAdminActivityAction(AUDIT_ACTIONS.USER_APPROVE)).toBe(true);
    // A technical action is not a filter, it is an attempt to widen the reading.
    expect(isAdminActivityAction(AUDIT_ACTIONS.USER_IMPERSONATE)).toBe(false);
    expect(isAdminActivityAction('nonsense')).toBe(false);
  });

  test('actionsOfCategory returns a category’s actions, or null for an unknown id', () => {
    expect(actionsOfCategory('akun')).toContain(AUDIT_ACTIONS.USER_APPROVE);
    expect(actionsOfCategory('data')).toContain(AUDIT_ACTIONS.DATA_EXPORT);
    expect(actionsOfCategory('does-not-exist')).toBeNull();
  });

  test('the flat list is exactly the union of the categories', () => {
    const fromCategories = ADMIN_ACTIVITY_CATEGORIES.flatMap((c) => [...c.actions]);
    expect([...ADMIN_ACTIVITY_ACTIONS].sort()).toEqual(fromCategories.sort());
  });
});

describe('maskEmail', () => {
  test('keeps the first two local characters and the whole domain', () => {
    expect(maskEmail('budi@contoh.com')).toBe('bu••••@contoh.com');
  });

  test('masks the whole local part when there is too little to recognise', () => {
    expect(maskEmail('ab@x.com')).toBe('••••@x.com');
    expect(maskEmail('a@b.com')).toBe('••••@b.com');
  });

  test('uses a fixed number of dots, so it never leaks the real length', () => {
    expect(maskEmail('verylonglocalpart@example.com')).toBe(
      've••••@example.com',
    );
  });

  test('returns null for an empty value and masks a malformed one', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeNull();
    expect(maskEmail('')).toBeNull();
    expect(maskEmail('noatsign')).toBe('••••');
    expect(maskEmail('@nolocal.com')).toBe('••••');
  });
});
