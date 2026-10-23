/**
 * Contract of the Eden client against dates (PRJ-01/T-01 and what they broke: PRJ-03, PRJ-04, T-02).
 * Every case goes through the real Eden treaty with only `fetch` stubbed, because the bug lived in
 * Eden's JSON reviver: it rewrote `YYYY-MM-DD` and ISO instants into `Date` objects, so readers typed
 * as `string` silently fell back to "no date". Tests that build their own objects cannot see that.
 */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { layoutGantt } from '../app/components/projects/gantt-layout';
import { milestoneValues, toMilestoneInput } from '../app/components/projects/plan/plan-form';
import { isMilestoneOverdue } from '../app/components/projects/plan/plan-view';
import { activityText, splitLinks } from '../app/components/tasks/task-timeline';
import { describeDue } from '../app/components/ui/DateText';
import { fetchProjectPlan } from '../app/lib/project-plan-api';
import { fetchProjects } from '../app/lib/projects-api';
import type { ProjectListQuery } from '../app/lib/projects-filters';
import { fetchTasks, fetchTimeline } from '../app/lib/tasks-api';
import type { TaskListQuery } from '../app/lib/tasks-filters';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const TODAY = '2026-10-19'; // test-only

let restoreFetch: (() => void) | null = null;
/** Answers every request with `body` as JSON, so the response still travels Eden's own parser. */
function serve(body: unknown) {
  const spy = spyOn(globalThis, 'fetch').mockImplementation(
    (async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch,
  );
  restoreFetch = () => spy.mockRestore();
}
afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
});

const listQuery = {} as ProjectListQuery;
const taskQuery = {} as TaskListQuery;

describe('Eden keeps dates as the server sent them (PRJ-01, T-01)', () => {
  it('leaves a project list `YYYY-MM-DD` a string, so the due column and the Gantt still read it', async () => {
    serve({
      items: [{ id: 'p1', startDate: '2026-10-01', dueDate: '2026-10-05' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    const page = await fetchProjects(listQuery);
    const row = page.items[0];
    expect(typeof row?.startDate).toBe('string');
    expect(row?.dueDate).toBe('2026-10-05');
    // What the user actually sees: the real sentence, not "—", and a drawn bar, not "no dates yet".
    expect(describeDue(row?.dueDate as string, TODAY)).toEqual({
      text: '5 Okt 2026 · terlambat 14 hari',
      late: true,
    });
    const layout = layoutGantt(
      [{ id: 'p1', startDate: row?.startDate, dueDate: row?.dueDate }],
      TODAY,
    );
    expect(layout.rows).toHaveLength(1);
    expect(layout.unscheduled).toEqual([]);
  });

  it('leaves a task list due date a string, so the late colour survives a client fetch', async () => {
    serve({ items: [{ id: 't1', ref: 'T-1', dueDate: '2026-10-17' }], nextCursor: null, caps: {} });
    const page = await fetchTasks(taskQuery);
    expect(typeof page.items[0]?.dueDate).toBe('string');
    expect(describeDue(page.items[0]?.dueDate as string, TODAY).late).toBe(true);
  });

  it('leaves an ISO instant a string too, so `createdAt` and `at` stay formattable', async () => {
    serve({ items: [], nextCursor: '2026-10-19T04:00:00.000Z' });
    const page = await fetchTimeline('T-1');
    expect(typeof page.nextCursor).toBe('string');
  });

  it('leaves a `DD/MM/YYYY` text alone: Eden also rewrote that shape', async () => {
    serve({
      items: [
        {
          kind: 'comment',
          id: 'c1',
          at: '2026-10-19T04:00:00.000Z',
          author: { id: 'u1', name: 'Ayu' },
          body: '05/10/2026',
          editedAt: null,
        },
      ],
      nextCursor: null,
    });
    const page = await fetchTimeline('T-1');
    const comment = page.items[0];
    expect(typeof (comment as { body: string }).body).toBe('string');
  });
});

describe('what the Eden fix also closes', () => {
  it('PRJ-03: a refetched milestone still PATCHes as `YYYY-MM-DD`, never a full instant', async () => {
    serve({
      phases: [],
      milestones: [
        { id: 'm1', title: 'Serah terima', dueDate: '2026-11-02', phaseId: null, reachedAt: null },
      ],
    });
    const plan = await fetchProjectPlan('p1');
    const milestone = plan.milestones[0];
    expect(milestone).toBeDefined();
    const body = toMilestoneInput(
      milestoneValues(milestone as Parameters<typeof milestoneValues>[0]),
    );
    // The route's own pattern; an ISO instant here is the 422 the audit saw.
    expect(body.dueDate).toMatch(ISO_DAY);
    expect(body.dueDate).toBe('2026-11-02');
  });

  it('PRJ-04: the "Terlewat" badge comes back, because the date compares as text again', async () => {
    serve({
      phases: [],
      milestones: [
        { id: 'm1', title: 'Serah terima', dueDate: '2026-10-02', phaseId: null, reachedAt: null },
      ],
    });
    const plan = await fetchProjectPlan('p1');
    expect(
      isMilestoneOverdue(plan.milestones[0] as Parameters<typeof isMilestoneOverdue>[0], TODAY),
    ).toBe(true);
  });

  it('T-02: a due-date change reads both dates instead of "(dikosongkan)"', async () => {
    serve({
      items: [
        {
          kind: 'activity',
          id: 'a1',
          at: '2026-10-19T04:00:00.000Z',
          author: { id: 'u1', name: 'Ayu' },
          action: 'due_date_changed',
          payload: { from: '2026-10-05', to: '2026-10-12' },
        },
      ],
      nextCursor: null,
    });
    const page = await fetchTimeline('T-1');
    const text = activityText(page.items[0] as Parameters<typeof activityText>[0]);
    expect(text).toBe('mengubah tenggat dari 5 Okt 2026 ke 12 Okt 2026');
    expect(text).not.toContain('dikosongkan');
  });

  it('T-02: a comment, title or step that is nothing but a date no longer crashes the history', async () => {
    serve({
      items: [
        {
          kind: 'comment',
          id: 'c1',
          at: '2026-10-19T04:00:00.000Z',
          author: { id: 'u1', name: 'Ayu' },
          body: '2026-10-05',
          editedAt: null,
        },
      ],
      nextCursor: null,
    });
    const page = await fetchTimeline('T-1');
    const body = (page.items[0] as { body: string }).body;
    // `splitLinks` calls `text.matchAll`, which a `Date` does not have: that threw for everyone.
    expect(() => splitLinks(body)).not.toThrow();
    expect(splitLinks(body)).toEqual([{ kind: 'text', value: '2026-10-05', at: 0 }]);
  });
});
