/**
 * /dashboard/settings (P11 AD-02): the page guards itself — React Router runs the layout and page
 * loaders in parallel, so a Member must be turned away here, not only by the layout — and the tab
 * shell renders the eight tabs of P11 §4 with the panel of `?tab=` and a list that scrolls
 * sideways instead of wrapping (eight tabs never fit 375px).
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { SETTINGS_TABS } from '../../app/components/admin/settings/settings.tabs';
import AdminSettingsPage, { loader } from '../../app/routes/admin/settings';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'adminsettings' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/dashboard/settings';
const SESSION = 'better-auth.session_token=test'; // test-only

async function runLoader() {
  const request = new Request(`http://localhost${PATH}`, { headers: { cookie: SESSION } });
  return loader({ request } as Parameters<typeof loader>[0]);
}

/** The status and Location of the redirect a guard throws, or null when the loader was allowed. */
async function redirectOf(): Promise<{ status: number; to: string | null } | null> {
  try {
    await runLoader();
    return null;
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown;
    return { status: thrown.status, to: thrown.headers.get('location') };
  }
}

/** Renders the page at `?tab=…` under a static router, like React Router does on the server. */
async function renderAt(search: string): Promise<string> {
  const handler = createStaticHandler([{ id: 'page', path: PATH, Component: AdminSettingsPage }]);
  const context = await handler.query(new Request(`http://localhost${PATH}${search}`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}

describe('/dashboard/settings guard', () => {
  it('turns a Member away on its own, without help from the layout loader', async () => {
    auth.as(await users.user({ role: 'member' }));
    expect(await redirectOf()).toEqual({ status: 302, to: '/app' });
  });

  it('turns a Project Manager away as well', async () => {
    auth.as(await users.user({ role: 'project_manager' }));
    expect(await redirectOf()).toEqual({ status: 302, to: '/app' });
  });

  it('sends a signed-out visitor to the login page', async () => {
    auth.as(null);
    expect((await redirectOf())?.to).toContain('/login');
  });

  it('lets an Admin and a Super-admin in', async () => {
    auth.as(await users.user({ role: 'admin' }));
    expect(await redirectOf()).toBeNull();
    auth.as(await users.user({ role: 'super-admin' }));
    expect(await redirectOf()).toBeNull();
  });
});

/** `&` comes back as `&amp;`, and the markup is far too large to put inside an expectation. */
const shows = (html: string, text: string) => html.includes(text.replace(/&/g, '&amp;'));

/** The opening tag of the tab list, where its inline style sits. */
const tabList = (html: string) =>
  html.match(/<div[^>]*role="tablist"[^>]*>/)?.[0] ??
  html.match(/<div[^>]*mantine-Tabs-list[^>]*>/)?.[0] ??
  '';

describe('/dashboard/settings shell', () => {
  it('renders every tab label', async () => {
    const html = await renderAt('');
    expect(SETTINGS_TABS.filter((t) => !shows(html, t.label)).map((t) => t.value)).toEqual([]);
  });

  it('opens the first tab when ?tab= is missing or unknown', async () => {
    const first = SETTINGS_TABS[0];
    for (const search of ['', '?tab=tidak-ada']) {
      const html = await renderAt(search);
      expect(shows(html, first.title)).toBe(true);
      expect(shows(html, SETTINGS_TABS[1].title)).toBe(false);
    }
  });

  it('opens the tab named by ?tab=, so every tab is linkable', async () => {
    const target = SETTINGS_TABS.find((t) => t.value === 'ekspor-data');
    const html = await renderAt('?tab=ekspor-data');
    expect(shows(html, target?.title ?? 'missing tab')).toBe(true);
    expect(shows(html, target?.description ?? 'missing description')).toBe(true);
    expect(shows(html, SETTINGS_TABS[0].title)).toBe(false);
  });

  it('keeps the tab list on one scrollable line instead of wrapping', async () => {
    const html = await renderAt('');
    expect(tabList(html)).toContain('flex-wrap:nowrap');
    expect(html.includes('mantine-ScrollArea-viewport')).toBe(true);
  });
});
