/**
 * Tugas page (S2-10, P3 §2 Tugas ①②④): "Tugas saya" in schedule groups in order with the server's
 * counts, the five-column "Semua tugas" table, the empty state ④ and the Q5 reason when the viewer
 * cannot create a task yet. No Papan toggle, CSV or Tag filter in S2.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { SCHEDULE_GROUPS } from '@server/metrics/schedule';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { NEW_TASK_PATH } from '../../app/components/tasks/CreateTaskButton';
import type { TaskListSeed } from '../../app/components/tasks/TaskListView';
import {
  EMPTY_COPY,
  FILTER_COPY,
  LIST_COPY,
  PAGE_COPY,
  SCHEDULE_GROUP_LABELS,
} from '../../app/components/tasks/tasks.copy';
import type { TaskCounts, TaskListItem } from '../../app/lib/tasks-api';
import { parseTaskFilters, toTaskQuery } from '../../app/lib/tasks-filters';
import TasksPage from '../../app/routes/app/tasks';

const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only
const VIEWER = 'u-me'; // test-only

type LoaderData = {
  seed: TaskListSeed;
  viewerId: string;
  canCreate: boolean;
  projects: { value: string; label: string }[];
  people: { value: string; label: string }[];
};

/** Renders the page under a data router whose root loader supplies the clock (DateText needs it). */
async function render(search: string, loaderData: LoaderData): Promise<string> {
  const Page = TasksPage as unknown as (props: { loaderData: LoaderData }) => React.ReactNode;
  const handler = createStaticHandler([
    {
      id: 'root',
      path: '/',
      loader: () => ({ clock: CLOCK }),
      Component: () => <Page loaderData={loaderData} />,
    },
  ]);
  const context = await handler.query(new Request(`http://x/${search}`));
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

const counts = (mine: Partial<TaskCounts['mine']> = {}): TaskCounts => ({
  mine: { overdue: 0, today: 0, tomorrow: 0, week: 0, later: 0, none: 0, ...mine },
  byStatus: { todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 },
});

const task = (over: Partial<TaskListItem> = {}): TaskListItem => ({
  id: 't-1',
  number: 42,
  title: 'Pasang keramik dapur',
  status: 'todo',
  priority: 'high',
  dueDate: '2026-10-09',
  assignee: { id: 'u-2', name: 'Dodi' },
  project: { id: 'p-1', name: 'Renovasi Dapur', status: 'active' },
  labels: [],
  checklist: { done: 0, total: 0 },
  primary: 'start',
  can: {},
  ...over,
});

/** Loader data for `search`, seeded the way the real loader does it. */
function data(
  search: string,
  over: { counts?: TaskCounts; items?: TaskListItem[]; canCreate?: boolean } = {},
): LoaderData {
  const filters = parseTaskFilters(new URLSearchParams(search));
  return {
    seed: {
      query: toTaskQuery(filters, { viewerId: VIEWER }),
      counts: over.counts ?? null,
      first: over.items ? { items: over.items, nextCursor: null, caps: {} } : null,
      loadedAt: Date.now(),
    },
    viewerId: VIEWER,
    canCreate: over.canCreate ?? true,
    projects: [{ value: 'p-1', label: 'Renovasi Dapur' }],
    people: [],
  };
}

const headingOf = (label: string, n: number) => LIST_COPY.groupCount(label, n);

describe('Tugas saya — schedule groups', () => {
  it('shows the non-empty groups in schedule order with the server counts', async () => {
    const c = counts({ overdue: 2, today: 1, week: 3, none: 1 });
    const html = await render('?', data('', { counts: c }));
    const shown = SCHEDULE_GROUPS.filter((g) => c.mine[g] > 0);
    const positions = shown.map((g) =>
      html.indexOf(headingOf(SCHEDULE_GROUP_LABELS[g], c.mine[g])),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).not.toContain(`${SCHEDULE_GROUP_LABELS.tomorrow} (`);
    expect(html).not.toContain(`${SCHEDULE_GROUP_LABELS.later} (`);
  });

  it('empty ④: says tasks assigned to you will appear and offers "Tugas baru"', async () => {
    const html = await render('?', data('', { counts: counts() }));
    expect(html).toContain(EMPTY_COPY.mineTitle);
    expect(html).toContain(EMPTY_COPY.mineHint);
    expect(html).toMatch(new RegExp(`href="${NEW_TASK_PATH}"[^>]*>[\\s\\S]*?${PAGE_COPY.create}`));
  });
});

describe('"+ Tugas baru" (caps.createTask, Q5)', () => {
  it('is a link to the task form when the server allows creating', async () => {
    const html = await render('?', data('', { counts: counts({ today: 1 }) }));
    expect(html).toContain(`href="${NEW_TASK_PATH}"`);
    expect(html).not.toContain(PAGE_COPY.createBlocked);
  });

  it('is turned off with the reason when the viewer is in no project yet', async () => {
    const html = await render('?', data('', { counts: counts(), canCreate: false }));
    expect(html).toContain(PAGE_COPY.createBlocked);
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-describedby="create-task-blocked"/);
    expect(html).not.toContain(`href="${NEW_TASK_PATH}"`);
  });
});

describe('Semua tugas — table', () => {
  it('has the five columns and the task, with a card for small screens', async () => {
    const html = await render('?lingkup=semua', data('lingkup=semua', { items: [task()] }));
    const headers = [...html.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/g)].map((m) => m[1]);
    expect(headers).toEqual([
      LIST_COPY.colTask,
      LIST_COPY.colStatus,
      LIST_COPY.colAssignee,
      LIST_COPY.colDue,
      LIST_COPY.colPriority,
    ]);
    // Once in the table and once in the mobile card.
    expect(html.split('Pasang keramik dapur').length - 1).toBe(2);
  });

  it('says nothing matches a filter and offers to clear it', async () => {
    const search = 'lingkup=semua&prioritas=kritis';
    const html = await render(`?${search}`, data(search, { items: [] }));
    expect(html).toContain(EMPTY_COPY.filteredTitle);
    expect(html).toContain(EMPTY_COPY.resetFilters);
  });
});

describe('filters', () => {
  it('offers search, the scope toggle, status chips, Proyek · Orang · Prioritas and sort', async () => {
    const html = await render('?', data('', { counts: counts({ today: 1 }) }));
    for (const text of [
      FILTER_COPY.searchLabel,
      FILTER_COPY.scopeMine,
      FILTER_COPY.scopeAll,
      FILTER_COPY.statusActive,
      FILTER_COPY.statusDone,
      FILTER_COPY.statusCanceled,
      FILTER_COPY.projectLabel,
      FILTER_COPY.personLabel,
      FILTER_COPY.priorityLabel,
      FILTER_COPY.sortLabel,
    ]) {
      expect(html).toContain(text);
    }
  });

  it.each(['?', '?lingkup=semua'])('%s has no Papan toggle, CSV or Tag filter', async (search) => {
    const html = await render(search, data(search.slice(1), { counts: counts(), items: [] }));
    expect(html).not.toMatch(/Papan|Kanban|CSV|Unduh|Impor|\bTag\b/);
  });
});
