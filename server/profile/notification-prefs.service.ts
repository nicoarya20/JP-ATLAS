/** Own notification switches (Pengaturan › Pemberitahuan): read and write `notification_pref`, no row = on. */
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { notificationPref } from '../db/schema';
import type { NotificationPrefCategory } from '../db/schema.notification';

/** What the two switches mean; the cards that must always reach the user are not listed on purpose. */
export type NotificationPrefs = { eventReminder: boolean; inboxNews: boolean };

/** Switch → `notification_pref.category`; the API names the switch the way the screen does. */
const CATEGORY_OF: Record<keyof NotificationPrefs, NotificationPrefCategory> = {
  eventReminder: 'event_reminder',
  inboxNews: 'news',
};
const SWITCHES = Object.keys(CATEGORY_OF) as (keyof NotificationPrefs)[];

/** Both switches for `userId`; a category without a row is on (the table stays empty until an opt-out). */
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const rows = await db
    .select({ category: notificationPref.category, inApp: notificationPref.inApp })
    .from(notificationPref)
    .where(eq(notificationPref.userId, userId));
  const off = new Set(rows.filter((r) => !r.inApp).map((r) => r.category));
  return {
    eventReminder: !off.has(CATEGORY_OF.eventReminder),
    inboxNews: !off.has(CATEGORY_OF.inboxNews),
  };
}

/** Sets only the switches present in `patch` (idempotent upsert per category), returns both switches. */
export async function setNotificationPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  for (const key of SWITCHES) {
    const inApp = patch[key];
    if (inApp === undefined) continue;
    const category = CATEGORY_OF[key];
    await db
      .insert(notificationPref)
      .values({ userId, category, inApp })
      .onConflictDoUpdate({
        target: [notificationPref.userId, notificationPref.category],
        set: { inApp, updatedAt: new Date() },
      });
  }
  return getNotificationPrefs(userId);
}
