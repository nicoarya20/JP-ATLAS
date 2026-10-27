/**
 * /dashboard/settings (P11 AD-02): the page guards itself — React Router runs the layout and page
 * loaders in parallel, so a Member must be turned away here, not only by the layout — and the tab
 * shell renders the five tabs of P11 §4 that really are settings (AD-20 moved the report and the
 * tool out, P14 D1 dropped Kebijakan kerja) with the panel of `?tab=` and a list that scrolls
 * sideways instead of wrapping (five tabs fit a laptop but never 375px). A tab resolves in three
 * steps — registered panel, else the preview that shows its shape with sample content, else the
 * bare placeholder.
 *
 * Since P13 RD-03 the first tab is a real panel fed by the page loader, so the harness below hands
 * the static route the loader data the page gets in the app. Which tab is open is read from the
 * markup (the hidden panels render empty), not from the placeholder text, so the next panel to
 * land does not break these tests.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { PRATINJAU_COPY } from '../../app/components/admin/pratinjau/pratinjau';
import { isPlaceholderTab, SETTINGS_PANELS } from '../../app/components/admin/settings/panels';
import { SETTINGS_PREVIEWS } from '../../app/components/admin/settings/settings.previews';
import { SETTINGS_TABS } from '../../app/components/admin/settings/settings.tabs';
import AdminSettingsPage, { loader } from '../../app/routes/admin/settings';
import { BRANDING_DEFAULTS } from '../../server/settings-branding';
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

/** The route id the real app gives this page; a panel reads the loader data by this name. */
const ROUTE_ID = 'routes/admin/settings';

/** Loader data with no branding override stored, which is what a fresh install looks like. */
const DEFAULT_LOADER_DATA = {
  branding: {
    settings: { appName: null, appTagline: null, supportUrl: null },
    defaults: BRANDING_DEFAULTS,
  },
};

/**
 * Renders the page at `?tab=…` under a static router, like React Router does on the server.
 * `data` is what the page loader returns; `null` stands for a panel rendered without it.
 */
async function renderAt(search: string, data: unknown = DEFAULT_LOADER_DATA): Promise<string> {
  const handler = createStaticHandler([
    { id: ROUTE_ID, path: PATH, Component: AdminSettingsPage, loader: () => data },
  ]);
  const context = await handler.query(new Request(`http://localhost${PATH}${search}`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  // A panel may fetch its own data, so the shell gets the same providers root.tsx gives it;
  // without the query client such a tab would throw instead of rendering.
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

/**
 * The `?tab=` value of the tab actually on screen. `keepMounted={false}` still renders a div per
 * tab, but only the open one has children and the rest carry `display:none` — so this reads which
 * tab opened without depending on any text inside it.
 */
function openTabsOf(html: string): string[] {
  return [...html.matchAll(/<div[^>]*role="tabpanel"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !tag.includes('display:none'))
    .map((tag) => /-panel-([a-z-]+)"/.exec(tag)?.[1] ?? '');
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
    for (const search of ['', '?tab=tidak-ada']) {
      expect(openTabsOf(await renderAt(search))).toEqual([SETTINGS_TABS[0].value]);
    }
  });

  it('opens the tab named by ?tab=, so every tab is linkable', async () => {
    for (const target of SETTINGS_TABS) {
      expect(openTabsOf(await renderAt(`?tab=${target.value}`))).toEqual([target.value]);
    }
  });

  it('shows no other tab content alongside the one that is open', async () => {
    // A tab not yet filled names the task that owns it, and the owners are unique, so an owner
    // string in the markup is the fingerprint of a tab that leaked into another tab's panel.
    for (const target of SETTINGS_TABS.filter((t) => isPlaceholderTab(t.value))) {
      const html = await renderAt(`?tab=${target.value}`);
      expect(shows(html, target.owner)).toBe(true);
      const leaked = SETTINGS_TABS.filter((t) => t.owner !== target.owner && shows(html, t.owner));
      expect(leaked.map((t) => t.value)).toEqual([]);
    }
  });

  it('prefers a registered panel, then the preview, then the bare placeholder', async () => {
    for (const tab of SETTINGS_TABS) {
      const html = await renderAt(`?tab=${tab.value}`);
      if (SETTINGS_PANELS[tab.value]) {
        // Filled for real: neither the preview strip nor the placeholder text may survive.
        expect(shows(html, PRATINJAU_COPY.title)).toBe(false);
        expect(shows(html, tab.description)).toBe(false);
      } else if (SETTINGS_PREVIEWS[tab.value]) {
        // Preview stands in: it must say so, and must not be mistaken for the placeholder.
        expect(shows(html, PRATINJAU_COPY.title)).toBe(true);
        expect(shows(html, tab.description)).toBe(false);
      } else {
        expect(shows(html, tab.description)).toBe(true);
      }
    }
  });

  it('Identitas renders the branding form from the loader, not a preview (P13 RD-03)', async () => {
    const html = await renderAt('?tab=identitas', {
      branding: {
        settings: { appName: 'Koperasi Maju', appTagline: null, supportUrl: null },
        defaults: BRANDING_DEFAULTS,
      },
    });
    expect(shows(html, 'Nama aplikasi')).toBe(true);
    expect(shows(html, 'Simpan branding')).toBe(true);
    // The stored value is in the form, and the built-in default is only the placeholder.
    expect(html.includes('value="Koperasi Maju"')).toBe(true);
    expect(html.includes(`placeholder="${BRANDING_DEFAULTS.appName}"`)).toBe(true);
    expect(shows(html, PRATINJAU_COPY.title)).toBe(false);
  });

  it('says so instead of showing an empty form when the loader data is missing', async () => {
    const html = await renderAt('?tab=identitas', null);
    expect(shows(html, 'Identitas belum bisa dimuat')).toBe(true);
    expect(shows(html, 'Simpan branding')).toBe(false);
  });

  it('keeps the tab list on one scrollable line instead of wrapping', async () => {
    const html = await renderAt('');
    expect(tabList(html)).toContain('flex-wrap:nowrap');
    expect(html.includes('mantine-ScrollArea-viewport')).toBe(true);
  });
});
