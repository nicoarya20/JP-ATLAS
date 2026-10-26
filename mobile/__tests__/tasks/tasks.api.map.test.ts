/**
 * The dictionary between the server's values and the screens' words, and one list row as a card.
 *
 * Two things these tests are really about. First, that nothing is invented: a row carries no kind,
 * no tags and one assignee, and the card says so rather than filling the hole in. Second, that
 * permissions are read, never decided — `capState` is the only reader of `can{}`, and its three
 * answers are the server's three states.
 */
import { capOn, capShown, capState, cardOf } from '@/data/tasks.api.map';
import {
  ACTIVE_STATUSES,
  CLOSED_GROUPS,
  cancelCategoryOf,
  cancelPickOf,
  moveCapKey,
  moveStep,
  primaryActionKey,
  priorityWord,
  SCHEDULE_GROUPS,
  sortSupported,
  sortWire,
  statusesOf,
  statusWire,
  statusWord,
} from '@/data/tasks.api.values';

import { CAN_ALL, wireItem } from '../helpers/tasks-wire';

describe('value maps', () => {
  it('turns the server enums into the words the screens show, and back', () => {
    expect(statusWord('in_progress')).toBe('In progress');
    expect(statusWord('canceled')).toBe('Canceled');
    expect(statusWire('In review')).toBe('in_review');
    expect(priorityWord('critical')).toBe('Critical');
  });

  it('names an unknown value instead of rendering it blank', () => {
    // @ts-expect-error a status the server grew that this app has not learnt
    expect(() => statusWord('archived')).toThrow('Unknown task status from the server: "archived"');
  });

  it('spells out the three open statuses for "All active": an empty status means every status', () => {
    expect(statusesOf(0)).toEqual(ACTIVE_STATUSES);
    expect(ACTIVE_STATUSES).toEqual(['todo', 'in_progress', 'in_review']);
    expect(statusesOf(4)).toEqual(['done']);
  });

  it('maps the sorts the server has and refuses the one it has not (A16)', () => {
    expect([sortWire(0), sortWire(1), sortWire(2)]).toEqual(['due', 'priority', 'updated']);
    expect(sortSupported(3)).toBe(false);
    // Title (A-Z) falls back to the default rather than asking for a sort that answers 422.
    expect(sortWire(3)).toBe('due');
  });

  it('pairs the cancel sheet radios with the server categories, in order', () => {
    expect(cancelCategoryOf(0)).toBe('duplicate');
    expect(cancelCategoryOf(4)).toBe('other');
    expect(cancelCategoryOf(5)).toBeNull();
    expect(cancelPickOf('out_of_scope')).toBe(2);
  });

  it('asks for the six schedule groups by due date and the two closed ones by status', () => {
    expect(SCHEDULE_GROUPS.map((g) => g.group)).toEqual([
      'overdue',
      'today',
      'tomorrow',
      'week',
      'later',
      'none',
    ]);
    // A task with no due date is its own group, not quietly folded into "Later".
    expect(SCHEDULE_GROUPS[5]).toEqual({ group: 'none', title: 'No due date' });
    expect(CLOSED_GROUPS.map((g) => [g.status, g.title])).toEqual([
      ['done', 'Done'],
      ['canceled', 'Canceled'],
    ]);
  });

  it('turns the server-picked primary step into the app button', () => {
    expect(primaryActionKey('complete')).toBe('markDone');
    expect(primaryActionKey('uncancel')).toBe('restore');
  });

  it('knows which board move is a transition and which is not', () => {
    expect(moveCapKey('To do', 'In progress')).toBe('start');
    expect(moveStep('To do', 'In progress')).toBe('start');
    expect(moveStep('In progress', 'In review')).toBe('request-review');
    expect(moveStep('Done', 'In progress')).toBe('reopen');
    // There is no todo -> in_review transition, so that side of the menu must not be offered.
    expect(moveCapKey('To do', 'In review')).toBeNull();
    expect(moveStep('In review', 'To do')).toBeNull();
  });
});

describe('capState', () => {
  it('reads the server three states and adds none of its own', () => {
    const can = { update: true, complete: 'REVIEW_REQUIRED' } as const;
    expect(capState(can, 'update')).toBe('on');
    expect(capState(can, 'complete')).toBe('off');
    // A key the server left out is hidden, never "disabled": the server chose to hide it.
    expect(capState(can, 'trash')).toBe('hidden');
    expect(capState(undefined, 'update')).toBe('hidden');
  });

  it('separates "usable" from "shown at all"', () => {
    const can = { cancel: 'LOCKED_BY_STATUS' } as const;
    expect(capOn(can, 'cancel')).toBe(false);
    expect(capShown(can, 'cancel')).toBe(true);
    expect(capShown(can, 'start')).toBe(false);
  });
});

describe('cardOf', () => {
  it('maps a row onto the card the lists have always shown', () => {
    // Seeded clock: Wednesday 7 Oct 2026, so a task due Oct 5 is two days overdue.
    expect(cardOf(wireItem())).toMatchObject({
      id: 't-12',
      no: 12,
      title: 'Fix login layout',
      project: 'Atlas Project',
      priority: 'High',
      status: 'To do',
      whoLabel: 'Nico Pratama',
      note: '2 days overdue',
      due: 'Oct 5',
      late: true,
      lateOnBoard: true,
      lateBy: '2 days late',
      steps: null,
      mayChange: true,
      primary: 'start',
    });
  });

  it('shows no kind, because a list row carries none (A3)', () => {
    expect(cardOf(wireItem()).type).toBeNull();
  });

  it('shows the one assignee the server sends, and says so when there is none (A1)', () => {
    expect(cardOf(wireItem()).people).toEqual([{ name: 'Nico', full: 'Nico Pratama' }]);
    const nobody = cardOf(wireItem({ assignee: null }));
    expect(nobody.people).toEqual([]);
    expect(nobody.whoLabel).toBe('Unassigned');
  });

  it('carries the capabilities through untouched, so a control reads them and not a role', () => {
    const card = cardOf(wireItem());
    expect(card.can).toEqual(CAN_ALL);
    expect(cardOf(wireItem({ can: {} })).mayChange).toBe(false);
  });

  it('notes a due date against the server today, in the words of the lists', () => {
    expect(cardOf(wireItem({ dueDate: '2026-10-07' })).note).toBe('Today');
    expect(cardOf(wireItem({ dueDate: '2026-10-08' })).note).toBe('Tomorrow');
    expect(cardOf(wireItem({ dueDate: '2026-10-09' })).note).toBe('Due Oct 9');
  });

  it('says a task has no due date rather than inventing one', () => {
    const card = cardOf(wireItem({ dueDate: null }));
    expect(card).toMatchObject({ note: 'No due date', due: '', late: false, lateBy: null });
  });

  it('says a closed task is closed, without a date it was not sent (B12)', () => {
    expect(cardOf(wireItem({ status: 'done', dueDate: '2026-09-20' })).note).toBe('Done');
    expect(cardOf(wireItem({ status: 'canceled' })).note).toBe('Canceled');
    // Done is never late on the board, however old its due date is.
    expect(cardOf(wireItem({ status: 'done' })).lateOnBoard).toBe(false);
  });

  it('uses the server label for a task waiting on the viewer review (B2)', () => {
    const waiting = wireItem({ status: 'in_review', labels: ['awaiting_my_review'] });
    expect(cardOf(waiting).note).toBe('Waiting for my review');
    expect(cardOf(wireItem({ status: 'in_review' })).note).toBe('In review');
  });

  it('shows the checklist progress the row carries', () => {
    expect(cardOf(wireItem({ checklist: { done: 2, total: 3 } })).steps).toBe('2/3');
  });
});
