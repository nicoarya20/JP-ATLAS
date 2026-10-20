/** The name colleagues see for a person: the display name from Pengaturan, else the account name. */
import { sql } from 'drizzle-orm';
import { profile, user } from '../db/schema';

/**
 * SQL for that name. The query must LEFT JOIN `profile` on `profile.user_id = user.id` (a user
 * without a profile row, or with a blank display name, falls back to `user.name`). Use it for
 * what is selected, searched and sorted, so the three agree.
 */
export const displayNameSql = sql<string>`coalesce(nullif(btrim(${profile.displayName}), ''), ${user.name})`;
