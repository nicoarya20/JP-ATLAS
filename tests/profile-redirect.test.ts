/** /profile merged into /app/settings (S1-15): signed-in users are redirected, anonymous ones go to /login. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';
import routes from '../app/routes';
import * as profileRoute from '../app/routes/app/profile';
import { installAuthSpies } from './support/auth';
import { createCleaner } from './support/cleanup';
import { createUserFactory } from './support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'profredir' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const ROOT = path.join(import.meta.dir, '..');
const SESSION = 'better-auth.session_token=test'; // test-only

/** The loader's Response, whether it returns the redirect or throws it (the guard throws). */
async function visit(cookie: string): Promise<Response> {
  const request = new Request('http://localhost/profile', { headers: { cookie } });
  try {
    const result = await profileRoute.loader({ request } as Parameters<
      typeof profileRoute.loader
    >[0]);
    if (result instanceof Response) return result;
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    throw thrown;
  }
  throw new Error('profile loader did not redirect');
}

describe('/profile redirect', () => {
  it.each(['member', 'project_manager', 'admin', 'super-admin'] as const)(
    'sends a signed-in %s to /app/settings with a 302',
    async (role) => {
      auth.as(await users.user({ role }));
      const res = await visit(SESSION);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/app/settings');
    },
  );

  it('sends an anonymous visitor to /login', async () => {
    auth.as(null);
    const res = await visit('');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login');
  });

  it('is redirect-only: no page component and no meta', () => {
    expect('default' in profileRoute).toBe(false);
    expect('meta' in profileRoute).toBe(false);
  });

  it('stays registered so old links and bookmarks keep working', () => {
    type Entry = { path?: string; file: string; children?: Entry[] };
    const flat = (es: Entry[]): Entry[] => es.flatMap((e) => [e, ...flat(e.children ?? [])]);
    const entry = flat(routes as Entry[]).find((e) => e.path === 'profile');
    expect(entry?.file).toBe('routes/app/profile.tsx');
  });

  it('is no longer linked from any page or component', () => {
    const linking = [...new Glob('app/**/*.{ts,tsx}').scanSync({ cwd: ROOT })].filter((file) =>
      /['"`]\/profile['"`]/.test(readFileSync(path.join(ROOT, file), 'utf8')),
    );
    expect(linking).toEqual([]);
  });
});
