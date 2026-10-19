import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { NO_TASKS_LABEL } from '../../app/components/pm/ProgressBar';
import { ConditionCell, ProjectCard } from '../../app/components/projects/ProjectCard';
import {
  clearFiltersHref,
  emptyKind,
  ProjectEmpty,
  type ProjectEmptyKind,
} from '../../app/components/projects/ProjectEmpty';
import { ProjectFilters } from '../../app/components/projects/ProjectFilters';
import { ProjectList } from '../../app/components/projects/ProjectList';
import { EMPTY_COPY, LIST_COPY } from '../../app/components/projects/projects.copy';
import { CONDITION_LABELS, PROJECT_STATUS_LABELS } from '../../app/lib/pm-labels';
import { DEFAULT_PROJECT_FILTERS } from '../../app/lib/projects-filters';

const TODAY = '2026-10-07'; // test-only
const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only

/** Renders under a data router whose root loader supplies the clock, like the real app (DateText needs it). */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}

const item = (over: Partial<ProjectListItem> = {}): ProjectListItem => ({
  id: 'p-1',
  name: 'Renovasi Dapur',
  status: 'active',
  priority: 'medium',
  lead: { id: 'u-1', name: 'Dodi' },
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  progress: { done: 1, total: 6, percent: 17 },
  condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  myRole: 'manager',
  ...over,
});

const list = (items: ProjectListItem[], over: Partial<Parameters<typeof ProjectList>[0]> = {}) =>
  render(
    <ProjectList
      items={items}
      total={items.length}
      today={TODAY}
      empty={<p>kosong</p>}
      hasMore={false}
      loadingMore={false}
      onMore={() => undefined}
      {...over}
    />,
  );

const empty = (kind: ProjectEmptyKind) =>
  render(<ProjectEmpty kind={kind} createTo="/app/projects/new" clearTo="/app/projects" />);

describe('ProjectList', () => {
  it('shows name, status, condition, progress, due date and lead', async () => {
    const html = await list([item()]);
    for (const text of [
      'Renovasi Dapur',
      PROJECT_STATUS_LABELS.active.label,
      CONDITION_LABELS.at_risk.label,
      '1 tugas penting terlambat',
      '17%',
      '31 Okt 2026',
      'Dodi',
      LIST_COPY.colLead,
    ]) {
      expect(html).toContain(text);
    }
  });

  it('renders the condition as icon plus text plus reason', async () => {
    const html = await render(<ConditionCell project={item()} />);
    const label = CONDITION_LABELS.at_risk.label;
    expect(html).toMatch(new RegExp(`<svg[\\s\\S]*${label}`));
    expect(html).toContain('1 tugas penting terlambat');
  });

  it('shows no condition pill for a project that is not running', async () => {
    const html = await render(
      <ConditionCell project={item({ status: 'draft', condition: null })} />,
    );
    expect(html).not.toContain(CONDITION_LABELS.on_track.label);
    expect(html).toContain(LIST_COPY.noCondition);
  });

  it('says "Belum ada tugas" instead of 0% when a project has no tasks', async () => {
    const html = await list([item({ progress: { done: 0, total: 0, percent: null } })]);
    expect(html).toContain(NO_TASKS_LABEL);
    expect(html).not.toContain('0%');
  });

  it('offers "Tampilkan lebih banyak" only while the server has more pages', async () => {
    expect(await list([item()], { hasMore: true, total: 30 })).toContain(LIST_COPY.more);
    expect(await list([item()])).not.toContain(LIST_COPY.more);
    expect(await list([item()], { hasMore: true, total: 30 })).toContain(LIST_COPY.shown(1, 30));
  });

  it('renders the empty node and no table when there are no projects', async () => {
    const html = await list([]);
    expect(html).toContain('kosong');
    expect(html).not.toContain('<table');
  });
});

describe('ProjectCard (mobile)', () => {
  it('carries the open action and the same facts as the table row', async () => {
    const html = await render(<ProjectCard project={item()} today={TODAY} />);
    expect(html).toContain(LIST_COPY.open);
    expect(html).toContain('href="/app/projects/p-1"');
    expect(html).toContain(CONDITION_LABELS.at_risk.label);
    expect(html).toContain('17%');
  });

  it('is part of the list markup below sm, next to the table', async () => {
    const html = await list([item()]);
    expect(html).toContain('<table');
    expect(html).toContain('role="list"');
    expect(html).toContain(LIST_COPY.open);
  });
});

describe('ProjectEmpty', () => {
  it('invites Admin/PM to create the first project', async () => {
    const html = await empty('creator');
    expect(html).toContain(EMPTY_COPY.creatorTitle);
    expect(html).toContain(EMPTY_COPY.creatorAction);
    expect(html).toContain('href="/app/projects/new"');
  });

  it('tells a Member who can help, without a create button', async () => {
    const html = await empty('member');
    expect(html).toContain(EMPTY_COPY.memberTitle);
    expect(html).toContain(EMPTY_COPY.memberBody);
    expect(html).not.toContain(EMPTY_COPY.creatorAction);
    expect(html).not.toContain('/app/projects/new');
  });

  it('offers "Hapus saringan" when filters match nothing', async () => {
    const html = await empty('filtered');
    expect(html).toContain(EMPTY_COPY.filteredTitle);
    expect(html).toContain(EMPTY_COPY.filteredAction);
  });

  it('picks the filtered state before the role-based one', () => {
    expect(emptyKind(true, true)).toBe('filtered');
    expect(emptyKind(true, false)).toBe('filtered');
    expect(emptyKind(false, true)).toBe('creator');
    expect(emptyKind(false, false)).toBe('member');
  });

  it('clears search and status but keeps scope and sort', () => {
    const f = { ...DEFAULT_PROJECT_FILTERS, lingkup: 'semua', urut: 'nama', q: 'dapur' } as const;
    expect(clearFiltersHref({ ...f, status: 'berjalan', hal: 3 })).toBe(
      '/app/projects?lingkup=semua&urut=nama',
    );
    expect(clearFiltersHref(DEFAULT_PROJECT_FILTERS)).toBe('/app/projects');
  });
});

describe('ProjectFilters', () => {
  const filters = (canSeeAll: boolean) =>
    render(
      <ProjectFilters
        filters={DEFAULT_PROJECT_FILTERS}
        canSeeAll={canSeeAll}
        onChange={() => undefined}
      />,
    );

  it('shows the "Semua proyek" toggle only when the server allows it', async () => {
    expect(await filters(true)).toContain(LIST_COPY.scopeAll);
    expect(await filters(false)).not.toContain(LIST_COPY.scopeAll);
  });

  it('has the status chips Semua · Draf · Berjalan · Ditunda · Selesai', async () => {
    const html = await filters(false);
    for (const s of ['draft', 'active', 'on_hold', 'completed'] as const) {
      expect(html).toContain(PROJECT_STATUS_LABELS[s].label);
    }
    expect(html).toContain(LIST_COPY.statusAll);
    expect(html).toContain(LIST_COPY.sortLabel);
  });
});
