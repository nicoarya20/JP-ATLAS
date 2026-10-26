/**
 * `GET /api/app/home`, and the clock that rides along with it (K1).
 *
 * This is the worked example of the pattern in `mobile/docs/phase2-pola-data.md`: one `resource`,
 * one `load` that does the request and nothing else, and the screens left reading a store.
 *
 * It is also where the app's clock comes from. There is no endpoint of its own for "today" — home
 * is called when the app opens anyway, so the session gate asks this resource for the clock and
 * the Home screen later asks the same resource for its data. Rule 1 means that is one request,
 * not two.
 *
 * Only `now` is read here. The rest of the payload is kept as it arrived, for the Gelombang 1
 * worker who ports the Home screen to type and map (full shape: `server/home/home.dto.ts`).
 */
import { apiGet } from '@/api/client';
import { ApiError, CLIENT_CODES } from '@/api/errors';
import { type SessionClock, setSessionClock } from '@/session/session.state';

import { resource } from './resource';

/** `now` of the home payload: the two fields the whole app's dates are built on. */
export type HomeNowWire = { today: string; timeZone: string };

/** What `GET /api/app/home` answers. Widen this as the Home screen is ported. */
export type HomeResponse = { now: HomeNowWire };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const badPayload = (why: string): ApiError =>
  new ApiError({
    message: `The server's home data could not be used: ${why}`,
    code: CLIENT_CODES.BAD_RESPONSE,
    status: 0,
  });

/**
 * The clock out of the payload, checked before it is trusted. A missing or malformed `now` is
 * raised rather than defaulted: every date in the app is derived from it, so a wrong one would
 * show wrong days everywhere instead of failing once, here.
 */
export function readClock(payload: unknown): SessionClock {
  const now = (payload as { now?: unknown } | null)?.now as Partial<HomeNowWire> | undefined;
  if (!now || typeof now !== 'object') throw badPayload('it carried no `now`.');
  const { today, timeZone } = now;
  if (typeof today !== 'string' || !ISO_DATE.test(today))
    throw badPayload(`\`now.today\` is not a YYYY-MM-DD date (${String(today)}).`);
  if (typeof timeZone !== 'string' || timeZone.trim() === '')
    throw badPayload('`now.timeZone` is missing.');
  return { today, timeZone };
}

async function loadHome(): Promise<HomeResponse> {
  const payload = await apiGet<HomeResponse>('/api/app/home');
  setSessionClock(readClock(payload));
  return payload;
}

/** Home's data, and the clock with it. */
export const homeResource = resource<HomeResponse>('home', loadHome);

/**
 * Make sure the server's clock is in the session, fetching home once if it is not. The session
 * gate calls this before it lets a dated screen render.
 */
export const ensureClock = () => homeResource.ensure();
