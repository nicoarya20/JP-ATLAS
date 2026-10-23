/**
 * P13 RD-01: the three settings modules behind migration 0022. Each one is checked twice — a NULL
 * column must read back as the built-in default (so the migration alone changes no behaviour), and
 * an unreasonable value must be refused rather than stored.
 */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { INVITATION_TTL_DAYS } from '../server/account/limits';
import { db } from '../server/db';
import { appSetting } from '../server/db/schema';
import { EVENT_REMINDER_MINUTES_MAX } from '../server/event/events.dto';
import { ROLES } from '../server/permissions';
import { invalidateSettingsCache, SINGLETON_ID } from '../server/settings.core';
import {
  ACCESS_POLICY_DEFAULTS,
  effectiveAccessPolicy,
  getAccessPolicy,
  getAccessPolicySettings,
  INVITATION_TTL_DAYS_MAX,
  normalizeAccessPolicy,
  parseAccessPolicy,
  upsertAccessPolicy,
} from '../server/settings-access-policy';
import {
  ANNOUNCEMENT_TEXT_MAX,
  getAnnouncement,
  normalizeAnnouncement,
  parseAnnouncement,
  upsertAnnouncement,
} from '../server/settings-announcement';
import {
  getNotificationDefaults,
  NOTIFICATION_DEFAULTS,
  normalizeNotificationDefaults,
  parseNotificationDefaults,
  upsertNotificationDefaults,
} from '../server/settings-notification-defaults';

/** Drops only the singleton row this file writes, never the whole table. */
async function resetSettings(): Promise<void> {
  await db
    .delete(appSetting)
    .where(eq(appSetting.id, SINGLETON_ID))
    .catch(() => {});
  invalidateSettingsCache();
}

afterEach(resetSettings);
afterAll(resetSettings);

describe('announcement', () => {
  test('NULL column means no banner at all', async () => {
    expect(parseAnnouncement(null)).toBeNull();
    expect(await getAnnouncement()).toBeNull();
  });

  test('stores a trimmed banner and clears it again', async () => {
    const saved = await upsertAnnouncement({
      text: '  Rilis baru Jumat ini.  ',
      level: 'warn',
      active: true,
      dismissibleUntil: '2026-11-01T00:00:00.000Z',
    });
    expect(saved).toEqual({
      text: 'Rilis baru Jumat ini.',
      level: 'warn',
      active: true,
      dismissibleUntil: '2026-11-01T00:00:00.000Z',
    });
    expect(await upsertAnnouncement(null)).toBeNull();
  });

  test('refuses an unknown level, empty text, overlong text and a bad date', () => {
    const base = { text: 'Halo', level: 'info', active: true, dismissibleUntil: null } as const;
    expect(() => normalizeAnnouncement({ ...base, level: 'kritis' as never })).toThrow(
      /Level pengumuman/,
    );
    expect(() => normalizeAnnouncement({ ...base, text: '   ' })).toThrow(/tidak boleh kosong/);
    expect(() =>
      normalizeAnnouncement({ ...base, text: 'x'.repeat(ANNOUNCEMENT_TEXT_MAX + 1) }),
    ).toThrow(/maksimal/);
    expect(() => normalizeAnnouncement({ ...base, dismissibleUntil: 'besok' })).toThrow(
      /tidak valid/,
    );
  });

  test('a stored row with a junk level degrades to the neutral tone instead of throwing', () => {
    const row = { announcement: { text: 'Halo', level: 'neon', active: true } } as never;
    expect(parseAnnouncement(row)?.level).toBe('info');
  });
});

describe('access policy', () => {
  test('NULL columns mean the behaviour that is hard-coded today', async () => {
    expect(await getAccessPolicySettings()).toEqual({
      requiresApproval: null,
      defaultRole: null,
      invitationTtlDays: null,
    });
    const effective = await getAccessPolicy();
    expect(effective).toEqual(ACCESS_POLICY_DEFAULTS);
    expect(effective.requiresApproval).toBe(true);
    expect(effective.defaultRole).toBe(ROLES.MEMBER);
    expect(effective.invitationTtlDays).toBe(INVITATION_TTL_DAYS);
  });

  test('stores the three fields and reads them back', async () => {
    const saved = await upsertAccessPolicy({
      requiresApproval: false,
      defaultRole: ROLES.PROJECT_MANAGER,
      invitationTtlDays: 7,
    });
    expect(saved).toEqual({
      requiresApproval: false,
      defaultRole: ROLES.PROJECT_MANAGER,
      invitationTtlDays: 7,
    });
    expect(await getAccessPolicy()).toEqual({
      requiresApproval: false,
      defaultRole: ROLES.PROJECT_MANAGER,
      invitationTtlDays: 7,
    });
  });

  test('never accepts admin or super-admin as the default sign-up role', async () => {
    for (const role of [ROLES.ADMIN, ROLES.SUPER_ADMIN, 'owner']) {
      expect(() =>
        normalizeAccessPolicy({
          requiresApproval: null,
          defaultRole: role as never,
          invitationTtlDays: null,
        }),
      ).toThrow(/tidak boleh dipakai untuk pendaftar/);
      await expect(
        upsertAccessPolicy({
          requiresApproval: null,
          defaultRole: role as never,
          invitationTtlDays: null,
        }),
      ).rejects.toThrow(/tidak boleh dipakai untuk pendaftar/);
    }
    // Nothing was written, so the effective role is still the default.
    expect((await getAccessPolicy()).defaultRole).toBe(ROLES.MEMBER);
  });

  test('refuses a negative, zero, fractional or oversized invitation TTL', () => {
    for (const days of [-1, 0, 2.5, INVITATION_TTL_DAYS_MAX + 1]) {
      expect(() =>
        normalizeAccessPolicy({
          requiresApproval: null,
          defaultRole: null,
          invitationTtlDays: days,
        }),
      ).toThrow(/Masa undangan/);
    }
  });

  test('a privileged or absurd value already in the row is read as "default", not applied', () => {
    const row = { defaultSignupRole: 'admin', invitationTtlDays: -5 } as never;
    const stored = parseAccessPolicy(row);
    expect(stored).toEqual({
      requiresApproval: null,
      defaultRole: null,
      invitationTtlDays: null,
    });
    expect(effectiveAccessPolicy(stored)).toEqual(ACCESS_POLICY_DEFAULTS);
  });
});

describe('notification defaults', () => {
  test('NULL column means both categories on and a 30-minute reminder', async () => {
    expect(parseNotificationDefaults(null)).toEqual(NOTIFICATION_DEFAULTS);
    expect(await getNotificationDefaults()).toEqual({
      news: true,
      eventReminder: true,
      defaultEventReminderMinutes: 30,
    });
  });

  test('stores the switches and the reminder minutes', async () => {
    const saved = await upsertNotificationDefaults({
      news: false,
      eventReminder: true,
      defaultEventReminderMinutes: 0,
    });
    expect(saved).toEqual({ news: false, eventReminder: true, defaultEventReminderMinutes: 0 });
    expect(await getNotificationDefaults()).toEqual(saved);
  });

  test('refuses negative, fractional and out-of-range reminder minutes', () => {
    for (const minutes of [-1, -30, 1.5, EVENT_REMINDER_MINUTES_MAX + 1]) {
      expect(() =>
        normalizeNotificationDefaults({
          news: true,
          eventReminder: true,
          defaultEventReminderMinutes: minutes,
        }),
      ).toThrow(/Pengingat acara bawaan/);
    }
  });

  test('a half-written row falls back per field, not wholesale', () => {
    const row = { notificationDefaults: { news: false, defaultEventReminderMinutes: -5 } } as never;
    expect(parseNotificationDefaults(row)).toEqual({
      news: false,
      eventReminder: true,
      defaultEventReminderMinutes: 30,
    });
  });
});
