/** Own-profile read/write for GET/PATCH /api/app/profile: whitelisted columns, trimmed text, no PII in logs. */
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { profile, user } from '../db/schema';
import type { TextSize } from '../pm/enums';
import { DEFAULT_TEXT_SIZE, isTextSize } from '../text-size';

export {
  PROFILE_DEPARTMENT_MAX,
  PROFILE_NAME_MAX,
  PROFILE_NICKNAME_MAX,
  PROFILE_PHONE_MAX,
  PROFILE_TITLE_MAX,
} from './profile.rules';

/** The fields a caller may change; anything else in the request body never reaches this module. */
export type ProfilePatch = {
  displayName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  textSize?: TextSize;
};

/**
 * `name` and `email` come from the account row and are read-only here: the name is still edited
 * through Better Auth (`updateUser`) so every existing screen keeps one source of truth.
 */
export type ProfileView = {
  userId: string;
  name: string;
  email: string;
  displayName: string | null;
  nickname: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  textSize: TextSize;
};

const TEXT_FIELDS = ['displayName', 'nickname', 'phone', 'jobTitle', 'department'] as const;

/** Trims a text field; blank means "clear it", so the column stays NULL instead of ''. */
function cleanText(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Picks only the whitelisted columns from `patch`, trimmed; `undefined` keys stay untouched. */
export function toColumns(patch: ProfilePatch): ProfilePatch {
  const out: ProfilePatch = {};
  for (const key of TEXT_FIELDS) {
    if (patch[key] !== undefined) out[key] = cleanText(patch[key]);
  }
  if (patch.textSize !== undefined && isTextSize(patch.textSize)) out.textSize = patch.textSize;
  return out;
}

type Row = typeof profile.$inferSelect | undefined;

function toView(account: { id: string; name: string; email: string }, row: Row): ProfileView {
  return {
    userId: account.id,
    name: account.name,
    email: account.email,
    displayName: row?.displayName ?? null,
    nickname: row?.nickname ?? null,
    phone: row?.phone ?? null,
    jobTitle: row?.jobTitle ?? null,
    department: row?.department ?? null,
    textSize: isTextSize(row?.textSize) ? row.textSize : DEFAULT_TEXT_SIZE,
  };
}

/** The caller's own profile; accounts without a profile row (soft-failed sign-up hook) get defaults. */
export async function getProfile(userId: string): Promise<ProfileView | null> {
  const [found] = await db
    .select({ account: { id: user.id, name: user.name, email: user.email }, row: profile })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);
  return found ? toView(found.account, found.row ?? undefined) : null;
}

/** Applies `patch` to the caller's profile (creating the row if missing) and returns the new view. */
export async function updateProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<ProfileView | null> {
  const columns = toColumns(patch);
  if (Object.keys(columns).length > 0) {
    // Upsert: a profile row is normally created at sign-up, but that step fails soft.
    await db
      .insert(profile)
      .values({ userId, ...columns })
      .onConflictDoUpdate({ target: profile.userId, set: { ...columns, updatedAt: new Date() } });
  }
  return getProfile(userId);
}
