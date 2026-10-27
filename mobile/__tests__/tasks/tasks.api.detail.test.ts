/**
 * One task DTO as the detail screen shows it, and its timeline as the sentences under it.
 *
 * Three things these tests are about. Nothing is invented: a field the server has no column for is
 * left out rather than filled in, and an action whose route does not exist is not offered however
 * `can{}` answers. Permissions are read, never decided: every control follows a `can{}` key, and a
 * key that is absent hides its control instead of disabling it. And the *instants* — `createdAt`,
 * `canceledAt`, `timeline.at` — are read in the team's zone, which is a different day from UTC for
 * seven hours of every day (K2).
 *
 * The clock is the sample's Wednesday, 7 Oct 2026, seeded for every test by the setup.
 */
import { detailTaskOf, getTaskDetailView } from '@/data/tasks.api.detail';
import { authorOfAction, historyOf } from '@/data/tasks.api.timeline';
import type { WireTimelineEntry } from '@/data/tasks.api.types';

import { wireActivity, wireComment, wireDetail } from '../helpers/tasks-wire';

const view = (over: Parameters<typeof wireDetail>[0] = {}, timeline: WireTimelineEntry[] = []) =>
  detailTaskOf(wireDetail(over), timeline, false);

describe('one task as its detail shows it', () => {
  it('builds the meta line from the fields the server sends, and leaves out the phase it has none for', () => {
    expect(view().meta).toBe('#12 · Atlas Project · Bug');
    expect(view({ phase: { id: 'p-1', name: 'Development' } }).meta).toBe(
      '#12 · Atlas Project · Bug · Development',
    );
  });

  it('says how the due date stands against the server’s today, not the phone’s', () => {
    expect(view({ dueDate: '2026-10-05' }).due).toBe('Overdue 2 days');
    expect(view({ dueDate: '2026-10-07' }).due).toBe('Today');
    expect(view({ dueDate: '2026-10-08' }).due).toBe('Tomorrow');
    expect(view({ dueDate: '2026-10-20' }).due).toBe('Due Oct 20');
    expect(view({ dueDate: null }).due).toBe('No due date');
  });

  it('reads a closed task’s own instant for its line, in the team’s zone', () => {
    // 17.30 UTC on the 6th is already 00.30 on the 7th in Asia/Jakarta: the day comes from the
    // zone, and a task finished just after midnight WIB must not read as the day before.
    expect(view({ status: 'done', completedAt: '2026-10-06T17:30:00.000Z' }).due).toBe(
      'Done Oct 7',
    );
    expect(view({ status: 'done', completedAt: null }).due).toBe('Done');
    expect(view({ status: 'canceled', canceledAt: '2026-10-06T17:30:00.000Z' }).due).toBe(
      'Canceled Oct 7',
    );
  });

  it('shows the facts the server has, and says when nobody is assigned', () => {
    const facts = view().facts;
    expect(facts.map((f) => f.key)).toEqual([
      'assignee',
      'due',
      'priority',
      'type',
      'review',
      'createdBy',
    ]);
    expect(facts.find((f) => f.key === 'due')).toMatchObject({
      value: 'Oct 5',
      note: '(2 days late)',
    });
    // `createdAt` is 02.30 UTC on 1 Oct, which is the 1st in Jakarta too — but it must go through
    // the zone to say so, not be sliced off the ISO string.
    expect(facts.find((f) => f.key === 'createdBy')).toMatchObject({ value: 'Nico · Oct 1' });
    const nobody = view({ assignee: null }).facts.find((f) => f.key === 'assignee');
    expect(nobody).toMatchObject({ people: [] });
  });

  it('shows the Reviewer fact only when the server names one, and no Tag fact at all', () => {
    expect(view().facts.some((f) => f.key === 'reviewer')).toBe(false);
    expect(
      view({ reviewer: { id: 'u-rina', name: 'Rina' } }).facts.find((f) => f.key === 'reviewer'),
    ).toMatchObject({ value: 'Rina' });
    // A2: `tags` is refused with 422 and has no column, so there is nothing to show.
    expect(view().facts.map((f) => f.label)).not.toContain('Tags');
  });
});

describe('what the detail offers', () => {
  it('offers a step the server shows, disables one it refuses, and hides one it left out', () => {
    const shown = view({ can: { start: true, complete: 'REVIEW_REQUIRED' } }).actions;
    expect(shown.map((a) => [a.key, a.enabled])).toEqual([
      ['start', true],
      ['markDone', false],
    ]);
    expect(shown.find((a) => a.key === 'markDone')?.hint).toBe('Not available for this task.');
    expect(view({ can: { complete: true } }).actions.map((a) => a.key)).toEqual(['markDone']);
  });

  it('never offers the three review steps, whose routes answer 404 until S4', () => {
    const can = { requestReview: true, approve: true, return: true, start: true } as const;
    expect(view({ can }).actions.map((a) => a.key)).toEqual(['start']);
  });

  it('highlights the step the server picked, and the first one offered when it picked a review step', () => {
    expect(
      view({ can: { start: true, complete: true }, primary: 'complete' }).actions.find(
        (a) => a.primary,
      )?.key,
    ).toBe('markDone');
    // `approve` is not on screen at all, so the highlight falls to the first button there is.
    expect(
      view({ can: { start: true, complete: true }, primary: 'approve' }).actions.find(
        (a) => a.primary,
      )?.key,
    ).toBe('start');
  });

  it('builds the ⋯ menu from can{} alone', () => {
    expect(view({ can: { update: true, cancel: true, trash: true } }).menu).toEqual([
      'edit',
      'cancel',
      'archive',
    ]);
    expect(view({ can: { update: true } }).menu).toEqual(['edit']);
    expect(view({ can: {} }).menu).toEqual([]);
  });

  it('a canceled task says why instead of the buttons, and offers Restore only when allowed', () => {
    const canceled = view({
      status: 'canceled',
      cancel: { category: 'not_needed', note: 'Dropped from the sprint' },
      can: { uncancel: true, comment: true },
    });
    expect(canceled.actions).toEqual([]);
    expect(canceled.stateNote).toEqual({
      kind: 'canceled',
      text: 'Canceled: No longer needed: Dropped from the sprint',
      restore: true,
    });
    expect(view({ status: 'canceled', cancel: null, can: {} }).stateNote).toEqual({
      kind: 'canceled',
      text: 'This task was canceled.',
      restore: false,
    });
  });

  it('names who canceled it from the timeline, which is where the server keeps the author', () => {
    const note = detailTaskOf(
      wireDetail({ status: 'canceled', cancel: { category: 'duplicate', note: null }, can: {} }),
      [wireActivity('canceled', { author: { id: 'u-rina', name: 'Rina' } })],
      false,
    ).stateNote;
    expect(note?.text).toBe('Canceled by Rina: Duplicate / already exists');
  });
});

describe('the steps and the description', () => {
  const items = [
    { id: 's-2', text: 'Second', isDone: false, position: 2 },
    { id: 's-1', text: 'First', isDone: true, position: 1 },
  ];

  it('puts the checklist in the server’s order and counts it in the title', () => {
    const steps = view({ checklist: { done: 1, total: 2, items } }).steps;
    expect(steps?.title).toBe('Steps 1/2');
    expect(steps?.items.map((i) => i.text)).toEqual(['First', 'Second']);
    expect(steps?.empty).toBeNull();
  });

  it('keeps the empty section on an open task and drops it on a closed one', () => {
    expect(view().steps).toMatchObject({ title: 'Steps', empty: 'No steps yet.' });
    expect(view({ status: 'done' }).steps).toBeNull();
  });

  it('says there is no description rather than showing an empty one', () => {
    expect(view({ description: null })).toMatchObject({
      description: 'No description yet.',
      hasDescription: false,
    });
  });
});

describe('the timeline as sentences', () => {
  it('reads a comment as what was written, and says when it was edited', () => {
    const [line] = historyOf([wireComment('Looks good', { editedAt: '2026-10-07T01:00:00.000Z' })]);
    expect(line?.text).toBe('Rina: Looks good (edited)');
    expect(line?.who).toBe('Rina');
  });

  it('files a line under the day it happened in the team’s zone', () => {
    // Both are the 6th in UTC and the 7th in Jakarta.
    expect(historyOf([wireActivity('started', { at: '2026-10-06T17:00:00.000Z' })])[0]?.when).toBe(
      'Oct 7',
    );
    expect(historyOf([wireComment('hi', { at: '2026-10-06T23:59:00.000Z' })])[0]?.when).toBe(
      'Oct 7',
    );
    // And just before midnight WIB it is still the 6th, which is 16.59 UTC.
    expect(historyOf([wireActivity('started', { at: '2026-10-06T16:59:00.000Z' })])[0]?.when).toBe(
      'Oct 6',
    );
  });

  it('shows an action it has not learnt as its own verb rather than dropping the row', () => {
    expect(historyOf([wireActivity('kind_changed')])[0]?.text).toBe('Nico kind_changed');
  });

  it('names the phase a move went to only when the payload really carries one', () => {
    expect(
      historyOf([wireActivity('phase_changed', { payload: { to: 'Development' } })])[0]?.text,
    ).toBe('Nico moved this task to Development');
    expect(historyOf([wireActivity('phase_changed', { payload: { to: 42 } })])[0]?.text).toBe(
      'Nico changed the phase',
    );
    expect(historyOf([wireActivity('phase_changed', { payload: null })])[0]?.text).toBe(
      'Nico changed the phase',
    );
  });

  it('finds the author of an action, or nobody when the timeline has none', () => {
    const rows = [
      wireActivity('started'),
      wireActivity('canceled', { author: { id: 'u-r', name: 'Rina' } }),
    ];
    expect(authorOfAction(rows, 'canceled')).toBe('Rina');
    expect(authorOfAction(rows, 'completed')).toBeNull();
    expect(authorOfAction([], 'canceled')).toBeNull();
  });
});

describe('the detail before anything has arrived', () => {
  it('has no task, is not missing, and is not an error', () => {
    expect(getTaskDetailView('4242')).toMatchObject({ phase: 'empty', task: null, missing: false });
  });
});
