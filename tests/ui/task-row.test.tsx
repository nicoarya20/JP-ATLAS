/**
 * Task row and card (S2-09): labels are icon plus words, and the one next-step button shows only for
 * start/complete — never for a review step, reopen/restore or a viewer the server gives no step.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { PrimaryAction } from '@server/access/task-flow.policy';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { TaskCard } from '../../app/components/tasks/TaskCard';
import { TaskRow } from '../../app/components/tasks/TaskRow';
import { NEXT_STEP_LABELS } from '../../app/components/tasks/tasks.copy';
import { TASK_LABEL_LABELS } from '../../app/lib/pm-labels';
import type { TaskListItem } from '../../app/lib/tasks-api';

const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only

/** Renders under a data router whose root loader supplies the clock (DateText needs it). */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
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

const task = (over: Partial<TaskListItem> = {}): TaskListItem => ({
  id: 't-1',
  number: 42,
  title: 'Pasang keramik dapur',
  status: 'todo',
  priority: 'high',
  dueDate: '2026-10-05',
  assignee: { id: 'u-1', name: 'Dodi' },
  project: { id: 'p-1', name: 'Renovasi Dapur', status: 'active' },
  labels: [],
  checklist: { done: 0, total: 0 },
  primary: 'start',
  can: {},
  ...over,
});

const row = (over: Partial<TaskListItem> = {}) => render(<TaskRow task={task(over)} />);
const card = (over: Partial<TaskListItem> = {}) => render(<TaskCard task={task(over)} />);
const stepLabels = Object.values(NEXT_STEP_LABELS);

describe('TaskRow', () => {
  it('links the whole row and the title to /app/tasks/:number', async () => {
    const html = await row();
    expect(html.match(/href="\/app\/tasks\/42"/g)?.length).toBe(2);
    expect(html).toContain('Pasang keramik dapur');
  });

  it('truncates the title with minWidth 0 so a long title cannot push the button away', async () => {
    const html = await row({ title: 'Judul yang sangat panjang sekali' });
    expect(html).toMatch(/<a[^>]*min-width:\s*0[^>]*>Judul yang sangat panjang sekali/);
  });

  it.each(['overdue', 'stale', 'reopened'] as const)(
    'shows the %s label as icon plus text',
    async (label) => {
      const html = await row({ labels: [label] });
      const spec = TASK_LABEL_LABELS[label];
      expect(html).toContain(spec.label);
      // The label's icon sits in the same badge, ahead of the words.
      expect(html).toMatch(new RegExp(`<svg[^>]*aria-hidden="true"[\\s\\S]*?${spec.label}`));
    },
  );

  it('leaves out labels that arrive with review and dependencies (S4)', async () => {
    const html = await row({ labels: ['awaiting_my_review', 'blocked'] });
    expect(html).not.toContain(TASK_LABEL_LABELS.awaiting_my_review.label);
    expect(html).not.toContain(TASK_LABEL_LABELS.blocked.label);
  });

  it.each([
    ['start', NEXT_STEP_LABELS.start],
    ['complete', NEXT_STEP_LABELS.complete],
  ] as const)('shows a light "%s" button with its icon', async (primary, label) => {
    const html = await row({ primary, status: primary === 'start' ? 'todo' : 'in_progress' });
    expect(html).toMatch(
      new RegExp(`<button[^>]*data-variant="light"[\\s\\S]*?<svg[\\s\\S]*?${label}`),
    );
    expect(html).not.toContain('data-variant="filled"');
  });

  it('shows no button when the server gives no next step (a Pemantau)', async () => {
    const html = await row({ primary: null });
    expect(html).not.toContain('<button');
    for (const label of stepLabels) expect(html).not.toContain(label);
  });

  it.each(['requestReview', 'approve', 'reopen', 'uncancel'] satisfies PrimaryAction[])(
    'renders no button for %s even when the API sends it',
    async (primary) => {
      const html = await row({ primary, status: 'in_progress' });
      expect(html).not.toContain('<button');
    },
  );
});

describe('TaskCard', () => {
  it('stacks status, assignee and a full-width step button', async () => {
    const html = await card({ primary: 'complete', status: 'in_progress' });
    expect(html).toContain('Dodi');
    expect(html).toContain(NEXT_STEP_LABELS.complete);
    expect(html).toMatch(/<button[^>]*data-block="true"/);
  });

  it('hides the button for requestReview and for no step', async () => {
    for (const primary of ['requestReview', null] as const) {
      const html = await card({ primary, status: 'in_progress' });
      expect(html).not.toContain('<button');
    }
  });
});
