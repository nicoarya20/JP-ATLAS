/**
 * /app/settings (S1-14): the loader decides who may delete their account (Q4/N03: Super-admin only,
 * never while impersonating) and the "Keamanan dan perangkat" section does not render the card for anyone else.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import {
  AdvancedCards,
  type AdvancedFlags,
  AdvancedSettings,
} from '../../app/components/account/AdvancedSettings';
import { loader } from '../../app/routes/app/settings';
import { db } from '../../server/db';
import { notificationPref, profile } from '../../server/db/schema';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'settings' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const SESSION = 'better-auth.session_token=test'; // test-only
const MEMBER = 'member';
const DANGER_TITLE = 'Hapus akun saya';

async function runLoader(cookie = SESSION) {
  const request = new Request('http://localhost/app/settings', { headers: { cookie } });
  return loader({ request } as Parameters<typeof loader>[0]);
}

/** Renders the Keamanan dan perangkat cards under a data router (the cards read the root clock) and React Query. */
async function renderAdvanced(flags: AdvancedFlags) {
  const node = (
    <QueryClientProvider client={new QueryClient()}>
      <AdvancedCards
        email="pengguna@example.test"
        role={MEMBER}
        logins={{ rows: [], total: 0 }}
        currentToken={undefined}
        flags={flags}
      />
    </QueryClientProvider>
  );
  const handler = createStaticHandler([{ id: 'root', path: '/', Component: () => node }]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  return renderToString(
    <MantineProvider>
      <StaticRouterProvider
        router={createStaticRouter(handler.dataRoutes, context)}
        context={context}
        hydrate={false}
      />
    </MantineProvider>,
  );
}

const FLAGS: AdvancedFlags = {
  emailAuthEnabled: false,
  googleEnabled: true,
  canDeleteAccount: false,
};

describe('settings loader', () => {
  it('returns the profile and the active text size, and hides account deletion from a member', async () => {
    const me = await users.user({ role: 'member' });
    await db.insert(profile).values({ userId: me.id, jobTitle: 'Bendahara', textSize: 'besar' });
    auth.as(me);
    const data = await runLoader();
    expect(data.profile.userId).toBe(me.id);
    expect(data.profile.jobTitle).toBe('Bendahara');
    expect(data.textSize).toBe('besar');
    expect(data.flags.canDeleteAccount).toBe(false);
  });

  it('hands the page both notification switches, on until the user opts out', async () => {
    const me = await users.user({ role: 'member' });
    auth.as(me);
    expect((await runLoader()).notificationPrefs).toEqual({ eventReminder: true, inboxNews: true });
    await db.insert(notificationPref).values({ userId: me.id, category: 'news', inApp: false });
    expect((await runLoader()).notificationPrefs).toEqual({
      eventReminder: true,
      inboxNews: false,
    });
  });

  it('starts a new account at the Normal size (Q13)', async () => {
    const me = await users.user({ role: 'member' });
    auth.as(me);
    const data = await runLoader();
    expect(data.textSize).toBe('normal');
    expect(data.profile.textSize).toBe('normal');
  });

  it.each(['project_manager', 'admin'] as const)('hides account deletion from %s', async (role) => {
    auth.as(await users.user({ role }));
    expect((await runLoader()).flags.canDeleteAccount).toBe(false);
  });

  it('lets a Super-admin delete their account, but not while impersonating', async () => {
    const boss = await users.user({ role: 'super-admin' });
    auth.as(boss);
    expect((await runLoader()).flags.canDeleteAccount).toBe(true);
    auth.as(boss, { impersonatedBy: 'someone-else' });
    expect((await runLoader()).flags.canDeleteAccount).toBe(false);
  });

  it('turns an anonymous visitor away before reading anything', async () => {
    auth.as(null);
    const thrown = await runLoader('').catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });
});

describe('Keamanan dan perangkat section', () => {
  it('starts closed: the accordion renders its title but none of the cards', () => {
    const html = renderToString(
      <MantineProvider>
        <AdvancedSettings
          email="pengguna@example.test"
          role={MEMBER}
          logins={{ rows: [], total: 0 }}
          currentToken={undefined}
          flags={{ ...FLAGS, canDeleteAccount: true }}
        />
      </MantineProvider>,
    );
    expect(html).toContain('Keamanan dan perangkat');
    expect(html).not.toContain('Lanjutan');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain(DANGER_TITLE);
  });

  it('does not render the delete-account card for a member', async () => {
    const html = await renderAdvanced(FLAGS);
    expect(html).toContain('Perangkat yang sedang masuk');
    expect(html).not.toContain(DANGER_TITLE);
  });

  it('renders it when the server allows deletion', async () => {
    const html = await renderAdvanced({ ...FLAGS, canDeleteAccount: true });
    expect(html).toContain(DANGER_TITLE);
  });

  it('hides the password and sign-in method cards while email sign-in is off', async () => {
    const off = await renderAdvanced(FLAGS);
    expect(off).not.toContain('Cara masuk');
    const on = await renderAdvanced({ ...FLAGS, emailAuthEnabled: true });
    expect(on).toContain('Cara masuk');
  });
});
