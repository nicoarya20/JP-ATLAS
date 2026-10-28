// A `GET /api/app/tasks` row as a card (tasks.card.ts), the board moves its `can{}` allows, and the English reason a
// disabled capability gives (caps.messages.ts, E-6). The test clock's today is Wed Oct 7, 2026.
import { CAP_UNKNOWN, capMessage, capReason } from '../../src/data/caps.messages';
import { apiCard, boardMoves, CARD_TEXT, cardStep, moveActionOf } from '../../src/data/tasks.card';
import { DODI, locked, row } from '../helpers/tasks-fixtures';

describe('apiCard', () => {
  test('a late open task: its date, how late, the assignee, steps and badges in words', () => {
    const card = apiCard(
      row(12, {
        title: 'Fix SSO login',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-05',
        checklist: { done: 2, total: 3 },
        labels: ['overdue', 'reopened', 'blocked', 'awaiting_my_review'],
      }),
    );
    expect(card).toEqual({
      no: 12,
      id: 't-12',
      title: 'Fix SSO login',
      project: 'Atlas Project',
      type: null,
      priority: 'High',
      status: 'In progress',
      people: [{ name: 'Nico', full: 'Nico Arya' }],
      whoLabel: 'Nico Arya',
      note: 'Reopened · Blocked',
      due: 'Oct 5',
      late: true,
      lateOnBoard: true,
      lateBy: '2 days late',
      steps: '2/3',
      moves: ['To do', 'Done'],
      denied: null,
      step: null,
    });
  });

  test('no due date, nobody on it, no steps; a closed task is never late', () => {
    expect(apiCard(row(3, { assignee: null }))).toMatchObject({
      due: '',
      late: false,
      lateBy: null,
      people: [],
      whoLabel: 'Unassigned',
      steps: null,
      note: '',
    });
    expect(apiCard(row(4, { status: 'done', dueDate: '2026-10-01' }))).toMatchObject({
      late: false,
      lateOnBoard: false,
      lateBy: null,
    });
    expect(apiCard(row(5, { assignee: DODI })).people).toEqual([
      { name: 'Dodi', full: 'Dodi Hartono' },
    ]);
  });
});

describe('cardStep', () => {
  test("a card's button runs the server's primary step when it is one a tap can run and allowed", () => {
    expect(cardStep({ primary: 'start', can: { start: true } })).toBe('start');
    expect(cardStep({ primary: 'complete', can: { complete: true } })).toBe('complete');
    expect(cardStep({ primary: 'uncancel', can: { uncancel: true } })).toBe('uncancel');
  });

  test('a refused step, a step that needs a reason or a review, or no primary: View instead', () => {
    expect(cardStep({ primary: 'start', can: { start: 'IMPERSONATING' } })).toBeNull();
    expect(cardStep({ primary: 'start', can: {} })).toBeNull();
    expect(cardStep({ primary: 'reopen', can: { reopen: true } })).toBeNull();
    expect(cardStep({ primary: null, can: { start: true } })).toBeNull();
  });
});

describe('boardMoves', () => {
  test('a step per allowed move: To do starts or completes, In progress stops or completes', () => {
    expect(moveActionOf('todo', 'In progress')).toBe('start');
    expect(moveActionOf('todo', 'Done')).toBe('complete');
    expect(moveActionOf('in_progress', 'To do')).toBe('unstart');
    expect(moveActionOf('in_progress', 'Done')).toBe('complete');
    expect(moveActionOf('todo', 'In review')).toBeNull();
    expect(moveActionOf('done', 'To do')).toBeNull();
    expect(boardMoves('todo', { start: true, complete: 'REVIEW_REQUIRED' })).toEqual({
      moves: ['In progress'],
      denied: null,
    });
  });

  test('nowhere to go: the server’s reason, the reopen hint, or plainly no move', () => {
    expect(boardMoves('todo', locked('IMPERSONATING'))).toEqual({
      moves: [],
      denied: capMessage('IMPERSONATING'),
    });
    expect(boardMoves('done', { reopen: true })).toEqual({
      moves: [],
      denied: CARD_TEXT.reopenFirst,
    });
    expect(boardMoves('in_review', { update: true })).toEqual({
      moves: [],
      denied: CARD_TEXT.noMove,
    });
    expect(boardMoves('todo', {})).toEqual({ moves: [], denied: CARD_TEXT.noMove });
  });
});

describe('caps.messages', () => {
  test('a known code has its sentence, an unknown one a plain reason; true and absent have none', () => {
    expect(capMessage('REVIEW_REQUIRED')).toBe(
      'This task needs a review first. Ask for a review before finishing it.',
    );
    expect(capMessage('SOMETHING_NEW')).toBe(CAP_UNKNOWN);
    expect(capReason('LOCKED_BY_STATUS')).toBe(capMessage('LOCKED_BY_STATUS'));
    expect(capReason(true)).toBeNull();
    expect(capReason(undefined)).toBeNull();
  });
});
