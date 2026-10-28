/**
 * A task's detail from `GET /api/app/tasks/:ref` (tasks.detail.ts, tasks.history.ts,
 * tasks.detail.api.ts, tasks.detail.write.ts): the buttons come from `can{}` with the server's
 * `primary`, a canceled task says why, the history is English built from each action, Reopen and
 * Cancel bodies are checked before sending, and only the last DETAIL_CACHE tasks stay loaded. The
 * screens are __tests__/tasks/tasks.screen.detail.test.tsx and tasks.screen.sheets.test.tsx.
 */
import { forgetAllResources } from '@/data/resource';
import { taskWriteTargets } from '@/data/tasks.api';
import { buildTaskDetail } from '@/data/tasks.detail';
import {
  DETAIL_CACHE,
  resetTaskDetails,
  taskDetailResource,
  taskDetailTargets,
} from '@/data/tasks.detail.api';
import { cancelBody, reopenReason } from '@/data/tasks.detail.write';
import { historyLines } from '@/data/tasks.history';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  activity,
  comment,
  DODI,
  detailOf,
  NICO,
  row,
  tasksServer,
} from '../helpers/tasks-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
beforeEach(() => {
  resetTaskDetails();
  forgetAllResources();
});
afterEach(() => {
  server?.restore();
  server = null;
});

const keys = (t: ReturnType<typeof buildTaskDetail>) => t.actions.map((a) => [a.key, a.primary]);

describe('buildTaskDetail', () => {
  test('offers the steps `can{}` allows, in a steady order, with the server’s primary', () => {
    const t = buildTaskDetail(detailOf(row(12, { status: 'in_progress' })));
    expect(keys(t)).toEqual([
      ['complete', true],
      ['unstart', false],
    ]);
    expect(t.actions.find((a) => a.key === 'unstart')?.label).toBe('Stop working');
    expect(t.cancel).toEqual({ off: null });
    expect(t.viewOnly).toBe(false);
  });

  test('a deny code is a disabled button with its reason; an absent key is no button', () => {
    const t = buildTaskDetail(
      detailOf(row(14, { can: { start: true, complete: 'REVIEW_REQUIRED' } })),
    );
    expect(t.actions.map((a) => [a.key, a.off])).toEqual([
      ['start', null],
      ['complete', 'This task needs a review first. Ask for a review before finishing it.'],
    ]);
    expect(t.cancel).toBeNull();
    expect(t.steps.edit).toBeNull();
    expect(t.comment).toBeNull();
  });

  test('Move to Trash follows `can.trash`: allowed, greyed out with its reason, or hidden', () => {
    const of = (trash?: true | 'PROJECT_IN_TRASH') =>
      buildTaskDetail(detailOf(row(14, { can: trash ? { trash } : {} }))).trash;
    expect(of(true)).toEqual({ off: null });
    expect(of('PROJECT_IN_TRASH')).toEqual({
      off: 'Its project is in the Trash. Restore the project first.',
    });
    expect(of()).toBeNull();
    // Trash alone is still a change the viewer may make.
    expect(buildTaskDetail(detailOf(row(14, { can: { trash: true } }))).viewOnly).toBe(false);
  });

  test('a canceled task says why and offers only Restore', () => {
    const r = row(14, { status: 'canceled' });
    const t = buildTaskDetail(
      detailOf(r, {
        cancel: { category: 'other', note: 'Client paused it' },
        canceledAt: '2026-10-06T02:00:00.000Z',
      }),
    );
    expect(t.actions).toEqual([]);
    expect(t.canceled?.text).toBe('Canceled: Other — Client paused it');
    expect(t.canceled?.restore?.key).toBe('uncancel');
    expect(t.due).toBe('Canceled Oct 6');
  });

  test('nothing allowed is view-only; meta, facts and steps come from the server', () => {
    const r = row(14, { can: {}, assignee: null, dueDate: '2026-10-08' });
    const t = buildTaskDetail(
      detailOf(r, {
        needsReview: true,
        reviewer: DODI,
        description: '  ',
        checklist: {
          done: 1,
          total: 2,
          items: [
            { id: 'b', text: 'Second', isDone: false, position: 1 },
            { id: 'a', text: 'First', isDone: true, position: 0 },
          ],
        },
      }),
    );
    expect(t.viewOnly).toBe(true);
    expect(t.meta).toBe('#14 · Atlas Project · Bug · Development');
    expect(t.due).toBe('Tomorrow');
    expect(t.description).toBeNull();
    expect(t.steps.title).toBe('Steps 1/2');
    expect(t.steps.items.map((i) => i.text)).toEqual(['First', 'Second']);
    expect(t.facts.map((f) => f.key)).toEqual([
      'assignee',
      'due',
      'priority',
      'type',
      'phase',
      'review',
      'reviewer',
      'createdBy',
    ]);
    expect(t.facts[0]).toMatchObject({ name: null });
    expect(t.facts[1]).toMatchObject({ value: 'Oct 8', note: '(tomorrow)' });
  });
});

describe('historyLines', () => {
  const task = { assignee: DODI };
  test('turns each action into an English line, keeping the server’s names', () => {
    const lines = historyLines(
      [
        activity('1', 'reopened', { reason: 'Login breaks' }),
        activity('2', 'canceled', { category: 'duplicate', note: null }),
        activity('3', 'assignee_changed', { from: NICO.id, to: DODI.id }),
        activity('4', 'assignee_changed', { from: DODI.id, to: 'u-gone' }),
        activity('5', 'assignee_changed', { from: DODI.id, to: null }),
        activity('6', 'due_date_changed', { from: null, to: '2026-10-20' }),
        activity('7', 'phase_changed', { from: 'Design', to: 'Development' }),
        activity('8', 'something_new', {}),
        activity('9', 'created', {}, { id: null, name: 'Mantan anggota' }),
      ],
      task,
    );
    expect(lines.map((l) => l.text)).toEqual([
      'Nico Arya reopened this task: Login breaks',
      'Nico Arya canceled this task: Duplicate / already exists',
      'Nico Arya assigned it to Dodi Hartono',
      'Nico Arya changed the assignee',
      'Nico Arya removed the assignee',
      'Nico Arya set the due date to Oct 20',
      'Nico Arya moved it to the phase Development',
      'Nico Arya changed this task',
      'Mantan anggota created this task',
    ]);
    expect(lines.at(-1)?.who).toBeNull();
  });

  test('a comment is its author’s words, marked when edited, dated in the team’s zone', () => {
    const at = '2026-10-06T18:00:00.000Z';
    const edited = comment('m', 'Done on staging', DODI, at, '2026-10-06T19:00:00.000Z');
    const [line] = historyLines([edited], task);
    expect(line).toMatchObject({
      text: 'Dodi Hartono: Done on staging (edited)',
      comment: true,
      who: 'Dodi Hartono',
      when: 'Oct 7', // 01:00 on Oct 7 in Jakarta
    });
  });
});

describe('Reopen and Cancel bodies', () => {
  test('a reason is 3 to 200 characters once trimmed', () => {
    expect(reopenReason('  ab ')).toBeNull();
    expect(reopenReason(' abc ')).toBe('abc');
    expect(reopenReason('x'.repeat(200))).toHaveLength(200);
    expect(reopenReason('x'.repeat(201))).toBeNull();
  });

  test('Cancel needs a category, and a note for Other of at most 500 characters', () => {
    expect(cancelBody(null, 'note')).toBeNull();
    expect(cancelBody('other', '  ')).toBeNull();
    expect(cancelBody('other', ' why ')).toEqual({ category: 'other', note: 'why' });
    expect(cancelBody('duplicate', '')).toEqual({ category: 'duplicate' });
    expect(cancelBody('duplicate', 'x'.repeat(501))).toBeNull();
  });
});

describe('kept details', () => {
  test(`only the last ${DETAIL_CACHE} tasks stay loaded, and a task write refreshes them`, async () => {
    const rows = Array.from({ length: DETAIL_CACHE + 1 }, (_, i) => row(i + 1));
    serve(tasksServer(rows).routes);
    for (const r of rows.slice(0, DETAIL_CACHE)) await taskDetailResource(r.number).ensure();
    const first = taskDetailResource(1); // read again: now the newest
    await taskDetailResource(DETAIL_CACHE + 1).ensure();
    expect(first.peek().phase).toBe('ready');
    expect(taskDetailResource(2).peek().phase).toBe('empty');
    expect(taskDetailTargets()).toHaveLength(DETAIL_CACHE * 2);
    expect(taskWriteTargets()).toEqual(expect.arrayContaining(taskDetailTargets()));
  });

  test('a task the server does not have is a 404', async () => {
    serve(tasksServer([row(1)]).routes);
    const res = taskDetailResource(99);
    await res.ensure();
    expect(res.peek()).toMatchObject({ phase: 'failed' });
  });
});
