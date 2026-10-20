/** The shell carries the bell: in the sidebar header and in the mobile header; areas without one are unchanged. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { AppFrame } from '../../app/components/AppFrame';
import { NotificationBell } from '../../app/components/inbox/NotificationBell';
import { NAV_GROUPS } from '../../app/routes/app/layout';

const USER = { id: 'u-1', name: 'Dodi', email: 'dodi@example.test', image: null } as never; // test-only

// A props object: `role` here is the account role, not an ARIA role.
const ACCOUNT = { role: 'member', user: USER, badgeColor: 'gray' } as const;

async function frame(withBell: boolean, collapsed = false) {
  const handler = createStaticHandler([
    {
      id: 'root',
      path: '/',
      Component: () => (
        <AppFrame
          navItems={NAV_GROUPS}
          navBadges={{ '/app/inbox': { value: 4, tone: 'alert' } }}
          bell={withBell ? <NotificationBell count={4} /> : undefined}
          {...ACCOUNT}
          initialCollapsed={collapsed}
        >
          <p>isi halaman</p>
        </AppFrame>
      ),
    },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error('redirect');
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

const bells = (html: string) => html.match(/aria-label="Inbox, 4 hal perlu Anda tanggapi"/g) ?? [];

describe('AppFrame bell', () => {
  it('renders the bell twice (sidebar header and mobile header), both linking to the Inbox', async () => {
    const html = await frame(true);
    expect(bells(html)).toHaveLength(2);
    expect(html).toContain('href="/app/inbox"');
  });

  it('keeps the bell when the sidebar is collapsed', async () => {
    expect(bells(await frame(true, true)).length).toBeGreaterThan(0);
  });

  it('shows the same number on the menu badge, so bell and badge agree', async () => {
    const html = await frame(true);
    expect(html).toContain('aria-label="Inbox, 4 hal perlu Anda tanggapi"');
    expect(html).toMatch(/NavLink-label">Inbox<[\s\S]{0,900}Badge-label">4</);
  });

  it('draws no bell for an area that passes none (Dev, Dashboard)', async () => {
    expect(bells(await frame(false))).toHaveLength(0);
  });
});
