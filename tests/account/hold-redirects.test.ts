/**
 * Anti-loop matrix for held accounts (P1 §2.3): every account state × every page runs the
 * real route loaders, follows the redirects they throw and must settle on a rendering page in
 * at most MAX_HOPS hops without visiting a page twice. Session and role are spied (not
 * module-mocked, which leaks across files) so the real guards, `heldKindOf` and `redirectToHome` decide.
 */
import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { loader as adminLayoutLoader } from '../../app/routes/admin/layout';
import { loader as appLayoutLoader } from '../../app/routes/app/layout';
import { loader as bannedLoader } from '../../app/routes/banned';
import { loader as goLoader } from '../../app/routes/go';
import { loader as homeLoader } from '../../app/routes/home';
import { loader as loginLoader } from '../../app/routes/login';
import { loader as waitingLoader } from '../../app/routes/waiting';
import { auth } from '../../server/auth';
import * as rolesMod from '../../server/roles';

const MAX_HOPS = 3;
const FUTURE_MS = 86_400_000;
const NOW_MS = Date.now();

type Account = Record<string, unknown> | null;
const ctx: { user: Account; role: string } = { user: null, role: 'member' };

const sessionSpy = spyOn(auth.api, 'getSession').mockImplementation((async () =>
  ctx.user
    ? { user: ctx.user, session: { impersonatedBy: null } }
    : null) as unknown as typeof auth.api.getSession);
const roleSpy = spyOn(rolesMod, 'resolveUserRole').mockImplementation(
  async () => ctx.role as 'member',
);
afterAll(() => {
  sessionSpy.mockRestore();
  roleSpy.mockRestore();
});

const account = (over: Record<string, unknown>) => ({
  id: 'hold-matrix-user',
  email: 'hold-matrix@example.test', // test-only
  name: 'Hold Matrix', // test-only
  banned: false,
  banExpires: null,
  isAnonymous: false,
  createdAt: new Date(NOW_MS),
  approvalStatus: 'approved',
  approvalReason: null,
  ...over,
});

const STATES = {
  approved: account({}),
  pending: account({ approvalStatus: 'pending' }),
  rejected: account({ approvalStatus: 'rejected', approvalReason: 'Data tidak lengkap' }),
  banned: account({ banned: true, banExpires: new Date(NOW_MS + FUTURE_MS) }),
  'expired ban + pending': account({
    banned: true,
    banExpires: new Date(NOW_MS - FUTURE_MS),
    approvalStatus: 'pending',
  }),
  'no session': null,
} as const;
type StateName = keyof typeof STATES;

type Loader = (args: never) => Promise<unknown>;
// Page → the loaders React Router runs for it (layout first). Only layouts for guarded areas:
// their page loaders call the same guards (tests/app-routes.test.ts pins that). /dev is left out:
// other test files replace `requireRole` process-wide, so its layout loader is not the real guard
// in a full run; /dashboard exercises the same guard path (requireRole delegates to requireAnyRole).
const PAGE_LOADERS: Record<string, Loader[]> = {
  '/': [homeLoader as Loader],
  '/login': [loginLoader as Loader],
  '/waiting': [waitingLoader as Loader],
  '/banned': [bannedLoader as Loader],
  '/go': [goLoader as Loader],
  '/app': [appLayoutLoader as Loader],
  '/dashboard': [adminLayoutLoader as Loader],
};

/** Run a page's loaders; the redirect target (path only) of the first one that throws one, else null. */
async function redirectOf(pathname: string): Promise<string | null> {
  const request = new Request(`http://localhost${pathname}`);
  for (const loader of PAGE_LOADERS[pathname] ?? []) {
    try {
      await loader({ request } as never);
    } catch (e) {
      if (!(e instanceof Response) || e.status < 300 || e.status > 399) throw e;
      return new URL(e.headers.get('location') ?? '', 'http://localhost').pathname;
    }
  }
  return null;
}

/** Follow redirects from `start`; fails the test on a cycle or more than MAX_HOPS hops. */
async function trail(start: string): Promise<string[]> {
  const path = [start];
  for (;;) {
    const next = await redirectOf(path[path.length - 1] as string);
    if (next === null) return path;
    if (path.includes(next)) throw new Error(`redirect cycle: ${[...path, next].join(' → ')}`);
    path.push(next);
    if (path.length - 1 > MAX_HOPS) throw new Error(`too many hops: ${path.join(' → ')}`);
  }
}

// Expected final page per state; pages listed in `renders` stay put (0 hops), every other page settles on `home`.
const EXPECT: Record<StateName, { home: string; renders: string[] }> = {
  approved: {
    home: '/app',
    renders: ['/', '/login', '/app'],
  },
  pending: { home: '/waiting', renders: ['/', '/login', '/waiting'] },
  rejected: { home: '/waiting', renders: ['/', '/login', '/waiting'] },
  banned: { home: '/banned', renders: ['/', '/login', '/banned'] },
  'expired ban + pending': { home: '/waiting', renders: ['/', '/login', '/waiting'] },
  'no session': { home: '/login', renders: ['/', '/login'] },
};

beforeEach(() => {
  ctx.role = 'member';
});

describe('hold redirect matrix (6 states × 7 pages)', () => {
  for (const [state, spec] of Object.entries(EXPECT) as [StateName, (typeof EXPECT)[StateName]][]) {
    describe(state, () => {
      for (const page of Object.keys(PAGE_LOADERS)) {
        const stays = spec.renders.includes(page);
        test(`${page} ${stays ? 'renders in place' : `settles on ${spec.home}`}`, async () => {
          ctx.user = STATES[state];
          const path = await trail(page);
          expect(path[path.length - 1]).toBe(stays ? page : spec.home);
          if (stays) expect(path).toEqual([page]);
          // Terminal pages are stable: following from the end must not move again.
          expect(await redirectOf(path[path.length - 1] as string)).toBeNull();
        });
      }
    });
  }

  test('approved admin is sent from the hold pages to /dashboard via /go', async () => {
    ctx.user = STATES.approved;
    ctx.role = 'admin';
    expect(await trail('/waiting')).toEqual(['/waiting', '/go', '/dashboard']);
    expect(await trail('/banned')).toEqual(['/banned', '/go', '/dashboard']);
  });

  test('a held account reaches its hold page in one hop from /go', async () => {
    ctx.user = STATES.pending;
    expect(await trail('/go')).toEqual(['/go', '/waiting']);
    ctx.user = STATES.banned;
    expect(await trail('/go')).toEqual(['/go', '/banned']);
  });
});

describe('/waiting loader data', () => {
  const run = () => waitingLoader({ request: new Request('http://localhost/waiting') } as never);

  test('pending account: kind, email and no reason', async () => {
    ctx.user = STATES.pending;
    const data = await run();
    expect(data).toMatchObject({
      kind: 'pending',
      email: 'hold-matrix@example.test',
      reason: null,
    });
  });

  test('rejected account exposes the trimmed admin reason; a blank reason becomes null', async () => {
    ctx.user = account({ approvalStatus: 'rejected', approvalReason: '  Bukan karyawan  ' });
    expect(await run()).toMatchObject({ kind: 'rejected', reason: 'Bukan karyawan' });
    ctx.user = account({ approvalStatus: 'rejected', approvalReason: '   ' });
    expect(await run()).toMatchObject({ kind: 'rejected', reason: null });
  });

  test('a session payload without approvalStatus fails closed to the pending view', async () => {
    ctx.user = account({ approvalStatus: undefined });
    expect(await run()).toMatchObject({ kind: 'pending' });
  });
});

describe('/banned loader data', () => {
  test('active ban renders with the ban details', async () => {
    ctx.user = account({ banned: true, banReason: 'Spam', banExpires: null });
    const data = (await bannedLoader({
      request: new Request('http://localhost/banned'),
    } as never)) as { ban: { active: boolean; permanent: boolean; reason: string | null } };
    expect(data.ban).toMatchObject({ active: true, permanent: true, reason: 'Spam' });
  });
});
