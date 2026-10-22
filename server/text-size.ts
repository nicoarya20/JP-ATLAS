/** Per-user text size preference: cookie name, scale table and (de)serialisation. Pure, no env/db. */
import { TEXT_SIZES, type TextSize } from './pm/enums';

export const TEXT_SIZE_COOKIE = 'mk-text-size';
export const DEFAULT_TEXT_SIZE: TextSize = 'normal';
/** Value handed to Mantine `theme.scale`; 'besar' = 125 % and 'sangat_besar' = 150 % (X1 D2). */
export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, besar: 1.25, sangat_besar: 1.5 };

const ONE_YEAR_SECONDS = 31_536_000;
const COOKIE_PATTERN = new RegExp(`(?:^|;\\s*)${TEXT_SIZE_COOKIE}=([^;]*)`);

/** Type guard for the three values the profile CHECK constraint and the cookie accept. */
export function isTextSize(value: unknown): value is TextSize {
  return typeof value === 'string' && (TEXT_SIZES as readonly string[]).includes(value);
}

/** The size stored in the request cookie, or null when absent or unrecognised (a stale or tampered value). */
export function readTextSizeCookie(request: Request): TextSize | null {
  const raw = COOKIE_PATTERN.exec(request.headers.get('cookie') ?? '')?.[1];
  return isTextSize(raw) ? raw : null;
}

/** Text size for a request using the cookie only; anything unknown falls back to 'normal'. */
export function getTextSize(request: Request): TextSize {
  return readTextSizeCookie(request) ?? DEFAULT_TEXT_SIZE;
}

/**
 * `Set-Cookie` value for a size. Not HttpOnly on purpose: it is a display preference, not a secret,
 * and the client may read it. Written by PATCH /api/app/profile (S1).
 */
export function textSizeCookie(size: TextSize): string {
  return `${TEXT_SIZE_COOKIE}=${size}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
