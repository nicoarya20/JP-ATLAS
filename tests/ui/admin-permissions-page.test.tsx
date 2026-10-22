/**
 * /dashboard/permissions (P11 AD-09, a menu of its own since AD-20): the page guards itself —
 * React Router runs the layout and page loaders in parallel, so a Member must be turned away here,
 * not only by the layout — and renders its own heading plus the role × capability matrix, read
 * only and readable on a 375px phone: five columns can only work as a sideways-scrolling table
 * plus a card per capability (CLAUDE.md §Mobile-Friendly, 2).
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { PERAN_IZIN_COPY } from '../../app/components/admin/permissions/peran-izin';
import {
  MATRIX_COPY,
  PermissionsMatrixView,
} from '../../app/components/admin/permissions/peran-izin.view';
import AdminPermissionsPage, {
  loader,
  PERMISSIONS_PAGE_COPY,
} from '../../app/routes/admin/permissions';
import { buildPermissionsMatrix } from '../../server/api/admin-permissions.matrix';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';
import { renderUi } from '../support/render-ui';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'adminperms' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/dashboard/permissions';
const SESSION = 'better-auth.session_token=test'; // test-only
const matrix = buildPermissionsMatrix();

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
  const handler = createStaticHandler([
    { id: 'page', path: PATH, Component: AdminPermissionsPage },
  ]);
  const context = await handler.query(new Request(`http://localhost${PATH}`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  // The matrix fetches its own data, so the page needs the providers root.tsx gives it.
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

/** `&` comes back escaped, and the markup is far too large to put inside an expectation. */
const shows = (markup: string, text: string) => markup.includes(text.replace(/&/g, '&amp;'));

describe('/dashboard/permissions guard', () => {
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

describe('the /dashboard/permissions page', () => {
  it('names itself, now that it is a menu and no longer a tab', async () => {
    const markup = await renderPage();
    expect(shows(markup, PERMISSIONS_PAGE_COPY.title)).toBe(true);
    expect(shows(markup, PERMISSIONS_PAGE_COPY.description)).toBe(true);
  });

  it('says that it is read-only and where roles are changed instead', async () => {
    const markup = await renderPage();
    expect(shows(markup, PERAN_IZIN_COPY.readOnly)).toBe(true);
    expect(markup).toContain('/dashboard/users');
  });
});

describe('the matrix view', () => {
  const html = () => renderUi(<PermissionsMatrixView matrix={matrix} />);

  it('shows every role as a column and every capability as a row', async () => {
    const markup = await html();
    for (const role of matrix.roles) expect(shows(markup, role.label)).toBe(true);
    for (const cap of matrix.capabilities) {
      expect(shows(markup, cap.label)).toBe(true);
      expect(shows(markup, cap.description)).toBe(true);
    }
  });

  it('answers in words, not only in colour', async () => {
    const markup = await html();
    expect(shows(markup, MATRIX_COPY.yes)).toBe(true);
    expect(shows(markup, MATRIX_COPY.no)).toBe(true);
  });

  it('shows the value of a non-boolean cell, such as the home area', async () => {
    const markup = await html();
    const home = matrix.capabilities.find((c) => c.id === 'home');
    for (const note of new Set((home?.cells ?? []).map((c) => c.note))) {
      expect(shows(markup, note ?? '')).toBe(true);
    }
  });

  it('scrolls the wide table sideways instead of overflowing the page', async () => {
    const markup = await html();
    expect(markup).toContain('overflow-x:auto');
  });

  it('gives the phone a card per capability instead of that table', async () => {
    const markup = await html();
    // Mantine turns the responsive props into these utility classes.
    expect(markup).toContain('mantine-visible-from-sm');
    expect(markup).toContain('mantine-hidden-from-sm');
  });

  it('repeats every answer in the card view, so nothing is desktop-only', async () => {
    const markup = await html();
    const cards = markup.slice(markup.indexOf('mantine-hidden-from-sm'));
    for (const role of matrix.roles) expect(shows(cards, role.label)).toBe(true);
    for (const cap of matrix.capabilities) expect(shows(cards, cap.label)).toBe(true);
  });

  it('offers nothing to press: the page is read-only', async () => {
    const markup = await html();
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<select');
  });
});
