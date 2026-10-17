/**
 * Task detail header (S2-12): no S4-S5 parts (Bukti, Tertahan, Perlu diperiksa, Tag), the buttons
 * follow `primary` and `can{}` (Selesai → Buka lagi, Dibatalkan → Pulihkan, none without a step),
 * the ⋯ menu cancels but never deletes, and "← Kembali" only ever returns to a task list.
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { BANNER_COPY } from '../../app/components/projects/projects.copy';
import {
  headerLabels,
  TaskHeader,
  type TaskHeaderData,
} from '../../app/components/tasks/TaskHeader';
import { hasTaskMenu } from '../../app/components/tasks/TaskMenu';
import { cancelNote } from '../../app/components/tasks/TaskStatusBanner';
import {
  CANCEL_CATEGORY_LABELS,
  DETAIL_COPY,
  NEXT_STEP_LABELS,
  REASON_COPY,
} from '../../app/components/tasks/tasks.copy';
import { noteProblem } from '../../app/components/ui/ReasonModal';
import { TASK_LABEL_LABELS } from '../../app/lib/pm-labels';
import { TASK_LIST_PATH, taskBackPath } from '../../app/lib/task-back';

const TODAY = '2026-10-07'; // test-only
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

const task = (over: Partial<TaskHeaderData> = {}): TaskHeaderData => ({
  number: 42,
  title: 'Pasang keramik dapur',
  status: 'todo',
  priority: 'high',
  dueDate: '2026-10-05',
  assignee: { id: 'u-1', name: 'Dodi' },
  project: { id: 'p-1', name: 'Renovasi Dapur', status: 'active' },
  kind: { id: 'k-1', name: 'Pekerjaan', baseKind: 'task' },
  labels: [],
  cancel: null,
  primary: 'start',
  can: { start: true, complete: true, cancel: true, update: true },
  ...over,
});
const header = (over: Partial<TaskHeaderData> = {}) =>
  render(<TaskHeader task={task(over)} today={TODAY} />);
const buttons = (html: string) =>
  [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, ''))
    // The ⋯ menu is an icon button with no text; only labelled buttons are steps.
    .filter((label) => label !== '');

describe('TaskHeader facts', () => {
  it('shows the number, title, project link, kind, priority, who works on it and the due date', async () => {
    const html = await header();
    expect(html).toContain('#42');
    expect(html).toContain('Pasang keramik dapur');
    expect(html).toContain('href="/app/projects/p-1"');
    expect(html).toContain('Renovasi Dapur');
    expect(html).toContain('Pekerjaan');
    expect(html).toContain('Tinggi');
    expect(html).toContain('Dodi');
    expect(html).toContain('terlambat 2 hari');
  });

  it('names a missing assignee and due date in words', async () => {
    const html = await header({ assignee: null, dueDate: null });
    expect(html).toContain(DETAIL_COPY.noAssignee);
    expect(html).toContain(DETAIL_COPY.noDue);
  });

  it('shows Terlambat, Mandek and Dibuka lagi but never Tertahan or a review label', async () => {
    const html = await header({
      labels: ['overdue', 'awaiting_my_review', 'blocked', 'stale', 'reopened'],
    });
    for (const l of ['overdue', 'stale', 'reopened'] as const) {
      expect(html).toContain(TASK_LABEL_LABELS[l].label);
    }
    expect(html).not.toContain(TASK_LABEL_LABELS.blocked.label);
    expect(html).not.toContain(TASK_LABEL_LABELS.awaiting_my_review.label);
    expect(headerLabels(['reopened', 'overdue'])).toEqual(['overdue', 'reopened']);
  });

  it('has no Bukti, Tertahan, Perlu diperiksa or Tag parts', async () => {
    const html = await header({ labels: ['blocked'] });
    for (const word of ['Bukti', 'Tertahan', 'Perlu diperiksa', 'Tag', 'Hapus']) {
      expect(html).not.toContain(word);
    }
  });
});

describe('TaskHeader buttons', () => {
  it('offers Mulai kerjakan plus Tandai selesai straight from Belum dikerjakan (T-A4)', async () => {
    expect(buttons(await header())).toEqual([NEXT_STEP_LABELS.start, NEXT_STEP_LABELS.complete]);
  });

  it('drops the direct Tandai selesai when can{} does not allow it', async () => {
    const b = buttons(await header({ can: { start: true } }));
    expect(b).toEqual([NEXT_STEP_LABELS.start]);
  });

  it('offers only Tandai selesai while the task is being worked on', async () => {
    const b = buttons(await header({ status: 'in_progress', primary: 'complete' }));
    expect(b).toEqual([NEXT_STEP_LABELS.complete]);
  });

  it('a finished task offers Buka lagi', async () => {
    const b = buttons(await header({ status: 'done', primary: 'reopen', can: { reopen: true } }));
    expect(b).toEqual([DETAIL_COPY.reopen]);
  });

  it('a canceled task offers Pulihkan and says why it was canceled', async () => {
    const html = await header({
      status: 'canceled',
      primary: 'uncancel',
      can: { uncancel: true },
      cancel: { category: 'other', note: 'Klien tidak jadi' },
    });
    expect(buttons(html)).toEqual([DETAIL_COPY.uncancel]);
    expect(html).toContain(`${CANCEL_CATEGORY_LABELS.other} — Klien tidak jadi`);
  });

  it('shows no step button at all when the server gives no primary step', async () => {
    const b = buttons(await header({ primary: null, can: {} }));
    expect(b).toEqual([]);
    const done = buttons(await header({ status: 'done', primary: null, can: {} }));
    expect(done).toEqual([]);
  });

  it('never shows a review step (S4) as the main button', async () => {
    const b = buttons(await header({ status: 'in_progress', primary: 'requestReview', can: {} }));
    expect(b).toEqual([]);
  });

  it('greys out Buka lagi with the reason when can{} carries a code', async () => {
    const html = await header({ status: 'done', primary: null, can: { reopen: 'IMPERSONATING' } });
    expect(html).toMatch(/<button[^>]*disabled[^>]*>/);
    expect(html).toContain('menyamar');
  });
});

describe('TaskHeader menu and banners', () => {
  it('has the ⋯ menu only when can{} lists cancel', async () => {
    expect(await header()).toContain(`aria-label="${DETAIL_COPY.menuLabel}"`);
    expect(await header({ can: { start: true } })).not.toContain(DETAIL_COPY.menuLabel);
    expect(hasTaskMenu({ number: 1, can: { cancel: 'IMPERSONATING' } })).toBe(true);
  });

  it('the menu cancels with an explanation and has no delete item', () => {
    const src = readFileSync(
      path.join(import.meta.dir, '../../app/components/tasks/TaskMenu.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // code only; the comments explain what is left out
    expect(src).toContain('DETAIL_COPY.cancelHint');
    expect(DETAIL_COPY.cancelHint).toBe(
      'Batalkan tugas — tugas tidak dihapus; tetap tercatat sebagai Dibatalkan dan bisa dipulihkan.',
    );
    expect(src).not.toMatch(/Hapus|delete|segera/i);
  });

  it.each(['completed', 'canceled', 'on_hold'] as const)(
    'notes a %s project still takes new tasks',
    async (status) => {
      const html = await header({ project: { id: 'p-1', name: 'Renovasi Dapur', status } });
      expect(html).toContain('Tugas baru tetap boleh ditambahkan.');
    },
  );

  it('has no project note while the project runs', async () => {
    expect(await header()).not.toContain('Tugas baru tetap boleh ditambahkan.');
    expect(BANNER_COPY.closed('Ditunda')).toBe(
      'Proyek ini sudah ditunda. Tugas baru tetap boleh ditambahkan.',
    );
  });

  it('cancelNote reads the category label alone when there is no note', () => {
    const t = task({ status: 'canceled', cancel: { category: 'duplicate', note: null } });
    expect(cancelNote(t)).toBe(CANCEL_CATEGORY_LABELS.duplicate);
    expect(cancelNote(task())).toBeNull();
  });
});

describe('reason dialogs', () => {
  const reopen = {
    requireNote: true,
    noteRequiredMessage: REASON_COPY.noteRequired,
    noteMinLength: 3,
  };
  const cancel = {
    categories: [
      { value: 'duplicate', label: 'Tugas dobel' },
      { value: 'other', label: 'Lainnya', requireNote: true },
    ],
    noteRequiredMessage: REASON_COPY.noteRequired,
  };

  it('Buka lagi needs a reason of at least 3 characters', () => {
    expect(noteProblem({ category: null, reason: ' ab ' }, reopen)).toBe(
      'Tuliskan alasannya agar tim paham.',
    );
    expect(noteProblem({ category: null, reason: 'Lantai retak' }, reopen)).toBeNull();
  });

  it('Batalkan needs a note only for Lainnya', () => {
    expect(noteProblem({ category: 'duplicate', reason: '' }, cancel)).toBeNull();
    expect(noteProblem({ category: 'other', reason: '' }, cancel)).toBe(REASON_COPY.noteRequired);
  });

  it('offers five cancel reasons', () => {
    expect(Object.keys(CANCEL_CATEGORY_LABELS)).toHaveLength(5);
  });
});

describe('taskBackPath', () => {
  const page = 'http://app.test/app/tasks/42'; // test-only

  it('returns to the list the user came from, filters included', () => {
    expect(taskBackPath(page, 'http://app.test/app/tasks?status=selesai&q=cat')).toBe(
      '/app/tasks?status=selesai&q=cat',
    );
    expect(taskBackPath(page, 'http://app.test/app/projects/p-1/tasks')).toBe(
      '/app/projects/p-1/tasks',
    );
  });

  it('prefers ?dari= over the referrer', () => {
    const url = `${page}?dari=${encodeURIComponent('/app/tasks?lingkup=semua')}`;
    expect(taskBackPath(url, 'http://app.test/app/projects/p-1/tasks')).toBe(
      '/app/tasks?lingkup=semua',
    );
  });

  it('falls back to the Tugas page for other sites, other pages and junk', () => {
    expect(taskBackPath(page, 'https://evil.test/app/tasks')).toBe(TASK_LIST_PATH);
    expect(taskBackPath(page, 'http://app.test/app/settings')).toBe(TASK_LIST_PATH);
    expect(taskBackPath(`${page}?dari=//evil.test/app/tasks`, null)).toBe(TASK_LIST_PATH);
    expect(taskBackPath(page, null)).toBe(TASK_LIST_PATH);
  });
});
