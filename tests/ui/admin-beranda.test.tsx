/**
 * Cards of the Admin Beranda (P11 AD-14/AD-15, still previews). The point of the screen is that a
 * reader can tell the one real number from the five samples, so these assertions are about the
 * labelling as much as the content: the approval queue carries no Pratinjau badge and the other
 * five do, each card asks its question and links on to the menu that acts on it.
 *
 * Rendered as components rather than through the page: the page itself needs the outlet context
 * and the session, which tests/admin-routes.test.ts and the layout already cover.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { ANTREAN_COPY, AntreanWidget } from '../../app/components/admin/home/antrean';
import {
  BERANDA_COPY,
  SAMPLE_LATE_TASKS,
  SAMPLE_MEMBERS,
} from '../../app/components/admin/home/beranda.content';
import {
  AgendaWidget,
  LateTasksWidget,
  MembersWidget,
  ProjectsWidget,
  RoleChangesWidget,
} from '../../app/components/admin/home/beranda.widgets';
import { PRATINJAU_COPY } from '../../app/components/admin/pratinjau/pratinjau';

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <MantineProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </MantineProvider>,
  );

/** `&` comes back as `&amp;`, and the markup is far too large to put inside an expectation. */
const shows = (html: string, text: string) => html.includes(text.replace(/&/g, '&amp;'));

const PREVIEWS = [
  { name: 'Anggota', node: <MembersWidget />, copy: BERANDA_COPY.members, to: '/dashboard/users' },
  {
    name: 'Proyek per status',
    node: <ProjectsWidget />,
    copy: BERANDA_COPY.projects,
    to: '/app/projects',
  },
  { name: 'Tugas telat', node: <LateTasksWidget />, copy: BERANDA_COPY.late, to: '/app/tasks' },
  { name: 'Agenda', node: <AgendaWidget />, copy: BERANDA_COPY.agenda, to: '/app/events' },
  {
    name: 'Perubahan peran',
    node: <RoleChangesWidget />,
    copy: BERANDA_COPY.roles,
    to: '/dashboard/permissions',
  },
];

describe('Beranda preview widgets', () => {
  it.each(PREVIEWS)('$name is marked as a preview', ({ node }) => {
    expect(shows(render(node), PRATINJAU_COPY.badge)).toBe(true);
  });

  it.each(PREVIEWS)('$name asks its question in the subtitle', ({ node, copy }) => {
    const html = render(node);
    expect(shows(html, copy.title)).toBe(true);
    expect(shows(html, copy.subtitle)).toBe(true);
  });

  it.each(PREVIEWS)('$name links on to the menu that acts on it', ({ node, to }) => {
    expect(render(node)).toContain(`href="${to}"`);
  });

  it('shows the sample figures, so the card is never an empty shell', () => {
    expect(shows(render(<MembersWidget />), String(SAMPLE_MEMBERS.total))).toBe(true);
    expect(shows(render(<LateTasksWidget />), SAMPLE_LATE_TASKS[0].title)).toBe(true);
  });
});

describe('Beranda approval queue (real data)', () => {
  it('carries no preview badge, because its number is the real one', () => {
    expect(shows(render(<AntreanWidget pending={0} />), PRATINJAU_COPY.badge)).toBe(false);
  });

  it('says nothing is waiting when the count is zero, and offers no review button', () => {
    const html = render(<AntreanWidget pending={0} />);
    expect(shows(html, ANTREAN_COPY.empty)).toBe(true);
    expect(shows(html, ANTREAN_COPY.review)).toBe(false);
  });

  it('counts the waiting registrants and offers the review button', () => {
    const html = render(<AntreanWidget pending={4} />);
    expect(shows(html, '4 menunggu persetujuan')).toBe(true);
    expect(html).toContain('href="/dashboard/users?tab=pending"');
  });
});
