/**
 * Tugas tab of a project and the summary highlights (S2-14, P3 §2 Proyek ⑧⑨): the shared list pinned
 * to the project, "Tambah tugas" to the form with `?proyek=` only when the server allows it (a
 * Pemantau gets none), and at most five overdue or high-priority tasks taken from the task API.
 */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { ProjectTaskHighlights } from '../../app/components/projects/ProjectTaskHighlights';
import { SUMMARY_COPY } from '../../app/components/projects/projects.copy';
import { newTaskInProject } from '../../app/components/tasks/CreateTaskButton';
import type { TaskListSeed } from '../../app/components/tasks/TaskListView';
import {
  EMPTY_COPY,
  FILTER_COPY,
  LIST_COPY,
  PROJECT_TAB_COPY,
} from '../../app/components/tasks/tasks.copy';
import { type TaskListItem, taskKeys } from '../../app/lib/tasks-api';
import { DEFAULT_TASK_FILTERS, toTaskQuery } from '../../app/lib/tasks-filters';
import { fetchProjectHighlights, HIGHLIGHTS_MAX } from '../../app/lib/tasks-highlights';
import ProjectTasksPage from '../../app/routes/app/project/tasks';

const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only
const PROJECT = 'p-1'; // test-only
const VIEWER = 'u-me'; // test-only

/** Renders `node` at /app/projects/p-1/… under a data router whose root loader supplies the clock. */
async function render(node: ReactNode, client = new QueryClient()): Promise<string> {
  const handler = createStaticHandler([
    {
      id: 'root',
      path: '/app/projects/:projectId/*',
      loader: () => ({ clock: CLOCK }),
      Component: () => node,
    },
  ]);
  const context = await handler.query(new Request(`http://x/app/projects/${PROJECT}/tasks`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

const task = (over: Partial<TaskListItem> = {}): TaskListItem => ({
  id: 't-1',
  number: 42,
  title: 'Pasang keramik dapur',
  status: 'todo',
  priority: 'high',
  dueDate: '2026-10-09',
  assignee: { id: 'u-2', name: 'Dodi' },
  project: { id: PROJECT, name: 'Renovasi Dapur', status: 'active' },
  phase: null,
  labels: [],
  checklist: { done: 0, total: 0 },
  primary: 'start',
  can: {},
  ...over,
});

type TabData = {
  seed: TaskListSeed;
  projectId: string;
  projectName: string;
  viewerId: string;
  canCreate: boolean;
  people: { value: string; label: string }[];
};

const tabData = (items: TaskListItem[], canCreate: boolean): TabData => ({
  seed: {
    query: toTaskQuery(DEFAULT_TASK_FILTERS, { viewerId: VIEWER, lockedProjectId: PROJECT }),
    first: { items, nextCursor: null, caps: {} },
    counts: null,
    loadedAt: Date.now(),
  },
  projectId: PROJECT,
  projectName: 'Renovasi Dapur',
  viewerId: VIEWER,
  canCreate,
  people: [],
});

const Tab = ProjectTasksPage as unknown as (props: { loaderData: TabData }) => ReactNode;
const createHref = newTaskInProject(PROJECT).replace('?', '\\?');

describe('Tugas tab', () => {
  it('empty: says the project has no tasks and offers "Tambah tugas" with the project filled in', async () => {
    const html = await render(<Tab loaderData={tabData([], true)} />);
    expect(html).toContain(EMPTY_COPY.projectTitle);
    expect(html).toContain(EMPTY_COPY.projectHint);
    expect(html).toMatch(
      new RegExp(`href="${createHref}"[^>]*>[\\s\\S]*?${PROJECT_TAB_COPY.create}`),
    );
    expect(newTaskInProject(PROJECT)).toBe('/app/tasks/new?proyek=p-1');
  });

  it('a Pemantau (no caps.createTask) sees the empty state without any button', async () => {
    const html = await render(<Tab loaderData={tabData([], false)} />);
    expect(html).toContain(EMPTY_COPY.projectTitle);
    expect(html).not.toContain(PROJECT_TAB_COPY.create);
    expect(html).not.toContain('/app/tasks/new');
  });

  it('lists the project tasks in the five-column table, without scope toggle or Proyek filter', async () => {
    const html = await render(<Tab loaderData={tabData([task()], true)} />);
    expect(html).toContain('Pasang keramik dapur');
    expect(html).toContain(LIST_COPY.colAssignee);
    expect(html).not.toContain(FILTER_COPY.scopeMine);
    expect(html).not.toContain(FILTER_COPY.projectLabel);
    expect(html).toContain(FILTER_COPY.personLabel);
    expect(html).toContain(FILTER_COPY.statusDoing);
    expect(html).toMatch(new RegExp(`<label[^>]*>${FILTER_COPY.dueLabel}</label>`));
    expect(html).not.toMatch(/Papan|Kanban|CSV|\bTag\b/);
  });
});

describe('summary highlights', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  const page = (items: TaskListItem[]) =>
    new Response(JSON.stringify({ items, nextCursor: null, caps: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  it('asks the server for overdue and high-priority tasks, overdue first, at most five', async () => {
    const urls: URL[] = [];
    const spy = spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      urls.push(url);
      const ids =
        url.searchParams.get('due') === 'overdue' ? ['a', 'b'] : ['b', 'c', 'd', 'e', 'f'];
      return page(ids.map((id) => task({ id })));
    }) as unknown as typeof fetch);
    restore = () => spy.mockRestore();

    const got = await fetchProjectHighlights(PROJECT);
    expect(got.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(got.length).toBe(HIGHLIGHTS_MAX);
    for (const url of urls) {
      expect(url.searchParams.get('scope')).toBe('project');
      expect(url.searchParams.get('projectId')).toBe(PROJECT);
      expect(url.searchParams.getAll('status')).not.toContain('done');
    }
    const urgent = urls.find((u) => u.searchParams.get('due') === null);
    expect(urgent?.searchParams.getAll('priority').sort()).toEqual(['critical', 'high']);
  });

  it('shows the highlighted tasks and a link to the Tugas tab', async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.highlights(PROJECT), [task({ labels: ['overdue'] })]);
    const html = await render(<ProjectTaskHighlights overdue={0} />, client);
    expect(html).toContain(SUMMARY_COPY.highlightsTitle);
    expect(html).toContain('Pasang keramik dapur');
    expect(html).toContain(`href="/app/projects/${PROJECT}/tasks"`);
    expect(html).not.toContain(SUMMARY_COPY.highlightsEmpty);
  });

  it('says nothing needs attention when the server finds no such task', async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.highlights(PROJECT), []);
    const html = await render(<ProjectTaskHighlights overdue={0} />, client);
    expect(html).toContain(SUMMARY_COPY.highlightsEmpty);
  });
});
