/**
 * `GET /api/app/home` as the worked example of the data pattern, and as the source of the app's
 * clock (K1). The clock is the part that must never be guessed: a payload without a usable `now`
 * fails here, once, instead of showing wrong days on every screen.
 */
import { requireClock } from '@/data/clock';
import { ensureClock, homeResource, mapWidget, readClock, widget } from '@/data/home.api';
import { forgetAllResources } from '@/data/resource';
import { sessionStore } from '@/session/session.state';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { homePayload, TEST_CLOCK } from '../helpers/clock-fixtures';
import {
  APPROVED_USER,
  resetSessionForTest,
  seedSessionWithoutClock,
} from '../helpers/session-fixtures';

/** The session without its clock, home left as it was: only the clock is missing. */
const setSessionClockless = () => sessionStore.set((prev) => ({ ...prev, clock: null }));

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  resetSessionForTest();
  // Signed in, clock not in yet: the moment the gate asks home for it.
  seedSessionWithoutClock();
});

afterEach(() => {
  server?.restore();
  server = null;
});

describe('the clock rides along with home', () => {
  it('puts today and the team zone into the session once home answers', async () => {
    serve({ '/api/app/home': { body: homePayload() } });

    const state = await ensureClock();

    expect(state.phase).toBe('ready');
    expect(sessionStore.get().clock).toEqual(TEST_CLOCK);
    expect(requireClock()).toEqual(TEST_CLOCK);
  });

  it('is one request shared by the gate and the Home screen, not two', async () => {
    const home = serve({ '/api/app/home': { body: homePayload() } });

    await Promise.all([ensureClock(), homeResource.ensure()]);
    await homeResource.ensure();

    expect(home.calls.filter((url) => url.includes('/api/app/home'))).toHaveLength(1);
    expect(homeResource.current()?.briefing).toEqual({
      ok: true,
      data: { lines: ['Satu tugas jatuh tempo hari ini.'], updatedLabel: '07.30' },
    });
  });

  it('asks again when home is on hand but the clock is not: the next account after a sign-out', async () => {
    const home = serve({ '/api/app/home': { body: homePayload() } });
    await ensureClock();
    // A new sign-in starts with no clock, whatever home looked like for the last account.
    setSessionClockless();

    await ensureClock();

    expect(home.calls.filter((url) => url.includes('/api/app/home'))).toHaveLength(2);
    expect(sessionStore.get().clock).toEqual(TEST_CLOCK);
  });

  it('leaves the clock empty when home fails, so no screen can compute a date', async () => {
    serve({ '/api/app/home': { throws: new TypeError('Network request failed') } });

    const state = await ensureClock();

    expect(state.phase).toBe('failed');
    expect(state.error?.isTransport).toBe(true);
    expect(sessionStore.get().clock).toBeNull();
    // A request that never arrived proves nothing about the account.
    expect(sessionStore.get().status).toBe('signed-in');
  });

  it('hands a 401 to the session, which ends it', async () => {
    serve({
      '/api/app/home': {
        status: 401,
        body: {
          error: 'Silakan masuk terlebih dahulu.',
          code: 'UNAUTHORIZED',
          status: 401,
          requestId: 'r1',
        },
      },
    });

    await ensureClock();

    expect(sessionStore.get()).toMatchObject({ status: 'signed-out', user: null, clock: null });
  });

  it('moves an account whose approval was withdrawn to the waiting screen', async () => {
    serve({
      '/api/app/home': {
        status: 403,
        body: {
          error: 'Akun menunggu persetujuan.',
          code: 'ACCOUNT_PENDING',
          status: 403,
          requestId: 'r2',
        },
      },
    });

    await ensureClock();

    expect(sessionStore.get().status).toBe('pending');
    expect(sessionStore.get().user?.id).toBe(APPROVED_USER.id);
  });

  it('refuses a payload whose clock it cannot trust, and keeps the session clock empty', async () => {
    serve({ '/api/app/home': { body: { ...homePayload(), now: { timeZone: 'Asia/Jakarta' } } } });

    const state = await ensureClock();

    expect(state.phase).toBe('failed');
    expect(state.error?.code).toBe('BAD_RESPONSE');
    expect(state.error?.message).toMatch(/now\.today/);
    expect(sessionStore.get().clock).toBeNull();
  });
});

describe('readClock', () => {
  it('reads today and the zone out of `now`', () => {
    expect(readClock(homePayload())).toEqual(TEST_CLOCK);
  });

  it.each([
    ['no payload', null, /no `now`/],
    ['no now', {}, /no `now`/],
    [
      'a date that is not YYYY-MM-DD',
      { now: { today: '7/10/2026', timeZone: 'Asia/Jakarta' } },
      /now\.today/,
    ],
    [
      'a datetime instead of a date',
      { now: { today: '2026-10-07T00:00:00Z', timeZone: 'Asia/Jakarta' } },
      /now\.today/,
    ],
    ['an empty zone', { now: { today: '2026-10-07', timeZone: '  ' } }, /now\.timeZone/],
    ['no zone', { now: { today: '2026-10-07' } }, /now\.timeZone/],
  ])('throws for %s rather than defaulting', (_name, payload, message) => {
    expect(() => readClock(payload)).toThrow(message);
  });
});

describe('sections', () => {
  it('passes a loaded section through', () => {
    expect(widget({ ok: true, data: [1, 2] })).toEqual({ ok: true, data: [1, 2] });
  });

  it('reads a missing section exactly like one the server reported as failed', () => {
    expect(widget(undefined)).toEqual({ ok: false });
    expect(widget({ ok: false })).toEqual({ ok: false });
    expect(widget({ ok: 'yes' } as never)).toEqual({ ok: false });
  });

  it('maps the data of a loaded section and leaves a failed one failed', () => {
    const double = (n: number) => n * 2;

    expect(mapWidget({ ok: true, data: 21 }, double)).toEqual({ ok: true, data: 42 });
    expect(mapWidget<number, number>({ ok: false }, double)).toEqual({ ok: false });
  });
});
