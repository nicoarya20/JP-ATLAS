/**
 * Organisation-wide notification defaults stored as JSON on the settings row (P13 RD-01, RD-08).
 * Two switches matching the preference categories a user may silence (`news`, `event_reminder` —
 * `action` is never switchable, see `notification/notification.catalog.ts`) plus the minutes a new
 * event's reminder starts at. NULL = both categories on and a 30-minute reminder, i.e. today's
 * behaviour, so the migration alone changes nothing.
 *
 * The join rule (a user may silence for themselves but never re-enable what Admin switched off)
 * belongs to `notification.recipients.ts`, not here: this module only stores the defaults.
 */
import { EVENT_REMINDER_MINUTES_MAX } from './event/events.dto';
import { readSettingsRow, type SettingsRow, upsertSettingsRow } from './settings.core';

export type NotificationDefaults = {
  /** Switch for the `news` preference category. */
  news: boolean;
  /** Switch for the `event_reminder` preference category. */
  eventReminder: boolean;
  /** Minutes before the start a new event's reminder is pre-filled with; applies to new events only. */
  defaultEventReminderMinutes: number;
};

export const NOTIFICATION_DEFAULTS: NotificationDefaults = {
  news: true,
  eventReminder: true,
  defaultEventReminderMinutes: 30,
};

function isValidMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= EVENT_REMINDER_MINUTES_MAX;
}

/**
 * Read the stored defaults, field by field over the built-ins: a row written before a field
 * existed keeps working, and one unreadable field does not discard the other two.
 */
export function parseNotificationDefaults(row: SettingsRow | null): NotificationDefaults {
  const raw = row?.notificationDefaults;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...NOTIFICATION_DEFAULTS };
  const d = raw as Partial<NotificationDefaults>;
  const minutes = d.defaultEventReminderMinutes;
  return {
    news: typeof d.news === 'boolean' ? d.news : NOTIFICATION_DEFAULTS.news,
    eventReminder:
      typeof d.eventReminder === 'boolean' ? d.eventReminder : NOTIFICATION_DEFAULTS.eventReminder,
    defaultEventReminderMinutes:
      typeof minutes === 'number' && isValidMinutes(minutes)
        ? minutes
        : NOTIFICATION_DEFAULTS.defaultEventReminderMinutes,
  };
}

/** Validate what Admin submitted; throws with an Indonesian message so the API can answer 400. */
export function normalizeNotificationDefaults(input: NotificationDefaults): NotificationDefaults {
  const minutes = input.defaultEventReminderMinutes;
  if (!isValidMinutes(minutes))
    throw new Error(
      `Pengingat acara bawaan harus bilangan bulat 0–${EVENT_REMINDER_MINUTES_MAX} menit (diterima: ${String(minutes)}).`,
    );
  return {
    news: Boolean(input.news),
    eventReminder: Boolean(input.eventReminder),
    defaultEventReminderMinutes: minutes,
  };
}

export async function getNotificationDefaults(): Promise<NotificationDefaults> {
  return parseNotificationDefaults(await readSettingsRow());
}

export async function upsertNotificationDefaults(
  input: NotificationDefaults,
): Promise<NotificationDefaults> {
  await upsertSettingsRow({ notificationDefaults: normalizeNotificationDefaults(input) });
  return parseNotificationDefaults(await readSettingsRow());
}
