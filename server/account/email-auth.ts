/**
 * Whether email+password sign-in is actually usable right now — the server-side twin of
 * `app/lib/login-mode.ts`, which answers the same question for the login screen.
 *
 * Two layers, both of which must say yes: the build policy (`emailPasswordEnabled`, production is
 * Google-only per R12 F1) and the runtime switch an operator flips in Pengaturan. A feature that
 * mints email credentials has to ask both, or it would create a way in that nothing can use.
 */
import { isProd } from '../env';
import { getSettings } from '../settings';
import { emailPasswordEnabled } from './auth-policy';

export async function emailAuthUsable(): Promise<boolean> {
  if (!emailPasswordEnabled(isProd)) return false;
  return (await getSettings()).emailAuthEnabled;
}
