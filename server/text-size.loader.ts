/** Server-only text size resolution for the root loader: cookie first, then the signed-in profile. */
import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db } from './db';
import { profile } from './db/schema';
import { hadSessionCookie } from './guard';
import type { TextSize } from './pm/enums';
import { processLog } from './ssr-log';
import { DEFAULT_TEXT_SIZE, isTextSize, readTextSizeCookie } from './text-size';

/**
 * Cookie wins. Without one (first visit on a device) a signed-in user gets `profile.text_size`;
 * anonymous requests never touch the DB. Soft-fails to 'normal': a preference must not break SSR.
 */
export async function resolveTextSize(request: Request): Promise<TextSize> {
  const fromCookie = readTextSizeCookie(request);
  if (fromCookie) return fromCookie;
  if (!hadSessionCookie(request)) return DEFAULT_TEXT_SIZE;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return DEFAULT_TEXT_SIZE;
    const [row] = await db
      .select({ textSize: profile.textSize })
      .from(profile)
      .where(eq(profile.userId, session.user.id))
      .limit(1);
    return isTextSize(row?.textSize) ? row.textSize : DEFAULT_TEXT_SIZE;
  } catch (e) {
    // Only the error class is logged: driver messages can echo query parameters (user id).
    processLog('warn', { err: e instanceof Error ? e.name : 'unknown' }, 'text size lookup failed');
    return DEFAULT_TEXT_SIZE;
  }
}
