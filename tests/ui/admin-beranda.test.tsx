/**
 * Cards of the Admin Beranda (P11 AD-14/AD-15). Each card is one `Widget { ok }` of
 * `GET /api/admin/overview`: it shows its answer when the section loaded, an informative empty state
 * when there is nothing to show, and a "Coba lagi" button when the section failed — so one broken
 * aggregate never blanks the screen. These assertions cover all three states plus the question each
 * card asks and the menu it links on to.
 *
 * Rendered as components rather than through the page: the page itself needs the outlet context and
 * the session, which tests/admin-routes.test.ts and the layout already cover.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type {
  AgendaSummary,
  MembersSummary,
  OverdueTasksSummary,
  ProjectsSummary,
  RoleChangesSummary,
  Widget,
} from '@server/admin/overview/overview.dto';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import type { RenderClock } from '../../app/lib/time-format';
import { AntreanWidget } from '../../app/components/admin/home/antrean';
import { OVERVIEW_COPY } from '../../app/components/admin/home/overview.copy';
import {
  AgendaWidget,
  LateTasksWidget,
  MembersWidget,
  ProjectsWidget,
  RoleChangesWidget,
} from '../../app/components/admin/home/overview.widgets';
import { HOME_COPY } from '../../app/components/home/home.copy';

// Renders under a data router whose root loader supplies the clock, like the real app, so widgets
// that read the root clock through useTimeFormat (e.g. Perubahan peran) render as they do in app.
const FIXED_CLOCK: RenderClock = { now: Date.parse('2026-10-27T05:00:00.000Z'), timeZone: 'Asia/Jakarta' };
const render = async (node: ReactNode) => {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: FIXED_CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
};

/** `&` comes back as `&amp;`, and the markup is far too large to put inside an expectation. */
const shows = (html: string, text: string) => html.includes(text.replace(/&/g, '&amp;'));

const retry = { onRetry: () => {}, retrying: false };
const failed = { ok: false } as const;

const MEMBERS: Widget<MembersSummary> = {
  ok: true,
  data: {
    active: 31,
    inactive: 3,
    roles: [
      { role: 'member', count: 22 },
      { role: 'project_manager', count: 6 },
      { role: 'admin', count: 2 },
      { role: 'super-admin', count: 1 },
    ],
  },
};

const PROJECTS: Widget<ProjectsSummary> = {
  ok: true,
  data: {
    total: 10,
    byStatus: [
      { status: 'draft', count: 1 },
      { status: 'active', count: 6 },
      { status: 'on_hold', count: 0 },
      { status: 'completed', count: 3 },
      { status: 'canceled', count: 0 },
    ],
  },
};

const OVERDUE: Widget<OverdueTasksSummary> = {
  ok: true,
  data: {
    total: 7,
    items: [
      {
        id: 't1',
        number: 12,
        title: 'Finalisasi kontrak vendor',
        projectName: 'Renovasi Kantor',
        assigneeName: 'Rina',
        dueDate: '2026-10-20',
        overdueDays: 6,
      },
    ],
  },
};

const AGENDA: Widget<AgendaSummary> = {
  ok: true,
  data: {
    total: 3,
    items: [
      {
        id: 'e1',
        title: 'Rapat mingguan proyek',
        kind: 'meeting',
        startsAt: '2026-10-28T02:00:00.000Z',
        endsAt: '2026-10-28T03:00:00.000Z',
        projectName: 'Portal Pelanggan',
      },
    ],
  },
};

const ROLES: Widget<RoleChangesSummary> = {
  ok: true,
  data: {
    items: [
      {
        id: 'a1',
        targetName: 'Budi',
        targetEmail: 'budi@contoh.co.id',
        from: 'member',
        to: 'project_manager',
        byName: 'Nico',
        byEmail: 'nico@contoh.co.id',
        at: '2026-10-27T02:00:00.000Z',
      },
    ],
  },
};

const CARDS = [
  {
    name: 'Anggota',
    node: <MembersWidget widget={MEMBERS} retry={retry} />,
    copy: OVERVIEW_COPY.members,
    to: '/dashboard/users',
  },
  {
    name: 'Proyek per status',
    node: <ProjectsWidget widget={PROJECTS} retry={retry} />,
    copy: OVERVIEW_COPY.projects,
    to: '/app/projects',
  },
  {
    name: 'Tugas telat',
    node: <LateTasksWidget widget={OVERDUE} retry={retry} />,
    copy: OVERVIEW_COPY.overdue,
    to: '/app/tasks',
  },
  {
    name: 'Agenda',
    node: <AgendaWidget widget={AGENDA} retry={retry} timeZone="Asia/Jakarta" />,
    copy: OVERVIEW_COPY.agenda,
    to: '/app/events',
  },
  {
    name: 'Perubahan peran',
    node: <RoleChangesWidget widget={ROLES} retry={retry} />,
    copy: OVERVIEW_COPY.roles,
    to: '/dashboard/users',
  },
];

describe('Admin Beranda widgets (loaded)', () => {
  it.each(CARDS)('$name asks its question in the subtitle', async ({ node, copy }) => {
    const html = await render(node);
    expect(shows(html, copy.title)).toBe(true);
    expect(shows(html, copy.subtitle)).toBe(true);
  });

  it.each(CARDS)('$name links on to the menu that acts on it', async ({ node, to }) => {
    expect(await render(node)).toContain(`href="${to}"`);
  });

  it('shows the real figures, not an empty shell', async () => {
    expect(shows(await render(<MembersWidget widget={MEMBERS} retry={retry} />), '31')).toBe(true);
    expect(
      shows(
        await render(<LateTasksWidget widget={OVERDUE} retry={retry} />),
        'Finalisasi kontrak vendor',
      ),
    ).toBe(true);
    // The overdue list says how many more there are behind its link.
    expect(
      shows(
        await render(<LateTasksWidget widget={OVERDUE} retry={retry} />),
        OVERVIEW_COPY.overdue.more(7),
      ),
    ).toBe(true);
  });

  it('renders the role change as "who: from → to"', async () => {
    const html = await render(<RoleChangesWidget widget={ROLES} retry={retry} />);
    expect(shows(html, 'Budi: Member → Project Manager')).toBe(true);
  });
});

describe('Admin Beranda widgets (empty)', () => {
  it('shows an informative empty state when there are no overdue tasks', async () => {
    const empty: Widget<OverdueTasksSummary> = { ok: true, data: { total: 0, items: [] } };
    expect(
      shows(await render(<LateTasksWidget widget={empty} retry={retry} />), OVERVIEW_COPY.overdue.empty),
    ).toBe(true);
  });

  it('shows an empty state for an agenda with nothing upcoming', async () => {
    const empty: Widget<AgendaSummary> = { ok: true, data: { total: 0, items: [] } };
    expect(
      shows(
        await render(<AgendaWidget widget={empty} retry={retry} timeZone="Asia/Jakarta" />),
        OVERVIEW_COPY.agenda.empty,
      ),
    ).toBe(true);
  });

  it('shows an empty state for no recent role changes', async () => {
    const empty: Widget<RoleChangesSummary> = { ok: true, data: { items: [] } };
    expect(
      shows(await render(<RoleChangesWidget widget={empty} retry={retry} />), OVERVIEW_COPY.roles.empty),
    ).toBe(true);
  });
});

describe('Admin Beranda widgets (failed section)', () => {
  it.each(CARDS)('$name offers "Coba lagi" when its section failed', async ({ name }) => {
    const nodes: Record<string, ReactNode> = {
      Anggota: <MembersWidget widget={failed} retry={retry} />,
      'Proyek per status': <ProjectsWidget widget={failed} retry={retry} />,
      'Tugas telat': <LateTasksWidget widget={failed} retry={retry} />,
      Agenda: <AgendaWidget widget={failed} retry={retry} timeZone="Asia/Jakarta" />,
      'Perubahan peran': <RoleChangesWidget widget={failed} retry={retry} />,
    };
    const html = await render(nodes[name]);
    expect(shows(html, HOME_COPY.error)).toBe(true);
    expect(shows(html, HOME_COPY.retry)).toBe(true);
  });
});

describe('Admin Beranda approval queue', () => {
  const ok = (count: number): Widget<{ count: number }> => ({ ok: true, data: { count } });

  it('says nothing is waiting when the count is zero, and offers no review button', async () => {
    const html = await render(<AntreanWidget widget={ok(0)} retry={retry} />);
    expect(shows(html, OVERVIEW_COPY.pending.empty)).toBe(true);
    expect(shows(html, OVERVIEW_COPY.pending.review)).toBe(false);
  });

  it('counts the waiting registrants and offers the review button', async () => {
    const html = await render(<AntreanWidget widget={ok(4)} retry={retry} />);
    expect(shows(html, OVERVIEW_COPY.pending.waiting('4'))).toBe(true);
    expect(html).toContain('href="/dashboard/users?tab=pending"');
  });

  it('offers "Coba lagi" when the section failed', async () => {
    const html = await render(<AntreanWidget widget={failed} retry={retry} />);
    expect(shows(html, HOME_COPY.retry)).toBe(true);
  });
});
