import { redirectToHome } from '@server/guard';
import { DEFAULT_TEXT_SIZE, readTextSizeCookie, textSizeCookie } from '@server/text-size';
import { resolveTextSize } from '@server/text-size.loader';
import type { Route } from './+types/go';

/**
 * Transient redirector used right after authentication. The role is unknown at
 * OAuth callback time, so login funnels here and we resolve the role server-side
 * then redirect to that role's home. This route never renders.
 */
export async function loader({ request }: Route.LoaderArgs) {
  try {
    return await redirectToHome(request);
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown;
    // New device: copy the saved size into the cookie. 'normal' is skipped because it is also what a
    // failed lookup returns, and a year-long cookie must not cache a transient DB error.
    const size = readTextSizeCookie(request) ? DEFAULT_TEXT_SIZE : await resolveTextSize(request);
    if (size !== DEFAULT_TEXT_SIZE) thrown.headers.append('Set-Cookie', textSizeCookie(size));
    throw thrown;
  }
}

export default function Go() {
  return null;
}
