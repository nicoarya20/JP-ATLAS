/**
 * /dashboard/export (P11 AD-10, a menu of its own since AD-20): the page guards itself — React
 * Router runs the layout and page loaders in parallel, so a Member must be turned away here, not
 * only by the layout — and shows one card per kind the endpoint serves, a download button for
 * each, and the warning that says what the file holds and that the export is recorded. The
 * file-name parsing the download helper does on the response header is covered here too.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { EXPORT_KINDS } from '@server/api/admin-export.kinds';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import {
  EXPORT_ITEMS,
  EXPORT_PANEL_COPY,
  missingExportCards,
} from '../../app/components/admin/export/ekspor-data.content';
import { filenameFromDisposition } from '../../app/components/admin/export/ekspor-data.download';
import AdminExportPage, { EXPORT_PAGE_COPY, loader } from '../../app/routes/admin/export';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'adminexport' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/dashboard/export';
const SESSION = 'better-auth.session_token=test'; // test-only

/** The status and Location of the redirect a guard throws, or null when the loader was allowed. */
async function redirectOf(): Promise<{ status: number; to: string | null } | null> {
  const request = new Request(`http://localhost${PATH}`, { headers: { cookie: SESSION } });
  try {
    await loader({ request } as Parameters<typeof loader>[0]);
    return null;
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown;
    return { status: thrown.status, to: thrown.headers.get('location') };
  }
}

/** Renders the page under a static router, like React Router does on the server. */
async function renderPage(): Promise<string> {
  const handler = createStaticHandler([{ id: 'page', path: PATH, Component: AdminExportPage }]);
  const context = await handler.query(new Request(`http://localhost${PATH}`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('/dashboard/export guard', () => {
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

describe('Ekspor data page content', () => {
  it('shows a card for every kind the endpoint serves', () => {
    expect(missingExportCards()).toEqual([]);
    expect(EXPORT_ITEMS.map((i) => i.kind)).toEqual([...EXPORT_KINDS]);
  });

  it('labels every button with the action, not with "Unduh" alone', () => {
    for (const item of EXPORT_ITEMS) {
      expect(item.action).toStartWith('Unduh CSV ');
      expect(item.action.length).toBeGreaterThan('Unduh CSV '.length);
      expect(item.description.length).toBeGreaterThan(20);
    }
  });
});

describe('Ekspor data page render', () => {
  it('names itself, now that it is a menu and no longer a tab', async () => {
    const html = await renderPage();
    expect(html).toContain(EXPORT_PAGE_COPY.title);
    expect(html).toContain(EXPORT_PAGE_COPY.description);
  });

  it('renders the three cards with their descriptions and buttons', async () => {
    const html = await renderPage();
    for (const item of EXPORT_ITEMS) {
      expect(html).toContain(item.label);
      expect(html).toContain(item.action);
    }
    expect(html).toContain('Unduh data organisasi');
  });

  it('says that every download is recorded and what the file holds', async () => {
    const html = await renderPage();
    expect(EXPORT_PANEL_COPY.auditNote).toContain('dicatat');
    expect(EXPORT_PANEL_COPY.auditNote).toContain('email');
    expect(html).toContain('Aktivitas beserta jenis dan jumlah barisnya');
  });

  it('offers no confirmation dialog: an export destroys nothing', async () => {
    const html = await renderPage();
    expect(html).not.toContain('Hapus');
    expect(html).not.toContain('permanen');
  });
});

describe('filenameFromDisposition', () => {
  it('reads the quoted and the bare form', () => {
    expect(filenameFromDisposition('attachment; filename="anggota-2026-10-21.csv"')).toBe(
      'anggota-2026-10-21.csv',
    );
    expect(filenameFromDisposition('attachment; filename=proyek-2026-10-21.csv')).toBe(
      'proyek-2026-10-21.csv',
    );
  });

  it('falls back to null when the header is missing, empty or has no name', () => {
    expect(filenameFromDisposition(null)).toBeNull();
    expect(filenameFromDisposition('')).toBeNull();
    expect(filenameFromDisposition('attachment')).toBeNull();
  });

  it('refuses a name carrying a path separator', () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"')).toBeNull();
    expect(filenameFromDisposition('attachment; filename="a\\b.csv"')).toBeNull();
  });
});
