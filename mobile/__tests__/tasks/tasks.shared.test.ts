import { me } from '../../src/data/people';
import { TASKS } from '../../src/data/sample';
import { GROUPS, groupOf, myGroups } from '../../src/data/tasks.groups';
import { baseQuery } from '../../src/data/tasks.query';
import {
  daysLate,
  deniedNotice,
  detailVariant,
  dueLabel,
  dueNote,
  mayArchive,
  mayChange,
  note,
  stepsTitle,
  type TaskItem,
  whoLabel,
} from '../../src/data/tasks.shared';
import { getTasksState } from '../../src/data/tasks.state';

// "Today" is Wednesday, Oct 7, 2026, so This week runs to Sunday, Oct 11.

const task = (no: number) => {
  const t = getTasksState().tasks.find((x) => x.no === no);
  if (!t) throw new Error(`test-only: no sample task #${no}`);
  return t;
};
const at = (due: string, status: TaskItem['status'] = 'To do') => ({ due, status });

describe('groupOf', () => {
  test('each urgency boundary', () => {
    const g = (due: string, status?: TaskItem['status']) => GROUPS[groupOf(at(due, status))];
    expect(g('2026-10-06')).toBe('Overdue');
    expect(g('2026-10-07')).toBe('Today');
    expect(g('2026-10-08')).toBe('Tomorrow');
    expect(g('2026-10-09')).toBe('This week');
    expect(g('2026-10-11')).toBe('This week');
    expect(g('2026-10-12')).toBe('Later');
    expect(g('2026-10-01', 'Done')).toBe('Done');
    expect(g('2026-10-01', 'Canceled')).toBe('Canceled');
  });
});

describe('myGroups per role', () => {
  const titles = (role: 'member' | 'pm' | 'admin') =>
    myGroups(role, getTasksState().tasks, baseQuery('mine'), me(role).name).map((g) => [
      g.title,
      g.tasks.map((t) => t.no),
    ]);

  test('a Manager sees the review queue first, then their tasks by urgency', () => {
    expect(titles('pm')).toEqual([
      ['Waiting for my review', [17]],
      ['Overdue', [12]],
      ['Today', [14]],
      ['Tomorrow', [9]],
    ]);
  });

  test('an Admin gets "Waiting for review"; a Member has no queue and keeps their In review task', () => {
    expect(titles('admin')).toEqual([['Waiting for review', [17]]]);
    expect(titles('member')).toEqual([
      ['Tomorrow', [17]],
      ['Later', [16]],
    ]);
  });

  test('any other sort is one list titled by the sort, review queue first', () => {
    const q = { ...baseQuery('mine'), sort: 3 };
    const groups = myGroups('pm', getTasksState().tasks, q, 'Nico');
    expect(groups.map((g) => g.title)).toEqual(['Waiting for my review', 'Title (A–Z)']);
    expect(groups[1].tasks.map((t) => t.no)).toEqual([12, 9, 14]);
  });
});

describe('notes and labels', () => {
  const x17 = () => getTasksState().info[17];

  test('an In review note names the reviewer unless that is the viewer', () => {
    expect(note(task(17), x17(), me('pm'), 'Nico')).toBe('Waiting for my review');
    expect(note(task(17), x17(), me('member'), 'Nico')).toBe('Awaiting review by Nico');
    expect(note(task(17), x17(), me('admin'), 'Nico')).toBe('Awaiting review by Nico');
    const review12 = { ...task(12), status: 'In review' as const };
    const x12 = getTasksState().info[12];
    expect(note(review12, x12, me('admin'), 'Nico')).toBe('Waiting for my review');
    expect(note(review12, x12, me('pm'), 'Nico')).toBe('Awaiting review by Admin');
    expect(note({ ...task(9), status: 'In review' }, undefined, me('pm'), 'Nico')).toBe(
      'Waiting for my review',
    );
    expect(note(task(12), x12, me('pm'), 'Nico')).toBe('2 days overdue');
  });

  test('due label and note from the sample today', () => {
    expect(dueLabel(task(12))).toBe('Overdue 2 days');
    expect(dueLabel(task(14))).toBe('Today');
    expect(dueLabel(task(9))).toBe('Tomorrow');
    expect(dueLabel(task(15))).toBe('Due Oct 9');
    expect(dueLabel(task(8))).toBe('Done Sep 20');
    expect([dueNote(task(12)), dueNote(task(14)), dueNote(task(9)), dueNote(task(15))]).toEqual([
      '(2 days late)',
      '(today)',
      '(tomorrow)',
      '',
    ]);
    expect([daysLate(1), daysLate(3)]).toEqual(['1 day late', '3 days late']);
  });

  test('who label, detail variant and steps title', () => {
    expect(whoLabel(task(12))).toBe('Nico Pratama');
    expect(whoLabel({ who: 'Rina', also: ['Dodi', 'Sri'] })).toBe('Rina Wulandari +2');
    expect(
      ['To do', 'Canceled', 'In progress', 'Done', 'In review'].map((status) =>
        detailVariant({ status: status as TaskItem['status'] }),
      ),
    ).toEqual(['todo', 'todo', 'progress', 'progress', 'review']);
    expect(stepsTitle(getTasksState().info[12].steps)).toBe('Steps 2/3');
    expect(stepsTitle([])).toBe('Steps');
  });
});

describe('who may change and archive', () => {
  test('a Member changes only tasks assigned to them; Managers and Admins any', () => {
    expect(mayChange(me('member'), task(16))).toBe(true);
    expect(mayChange(me('member'), task(12))).toBe(false);
    expect(mayChange(me('member'), { who: 'Rina', also: ['Dodi'] })).toBe(true);
    expect(mayChange(me('pm'), task(15))).toBe(true);
    expect(mayChange(me('admin'), task(15))).toBe(true);
    expect(deniedNotice({ who: 'Nico', also: ['Rina'] })).toBe(
      'Only Nico or Rina can change this task',
    );
  });

  test('a Member archives only tasks they created', () => {
    expect(mayArchive(me('member'), { by: 'Dodi' })).toBe(true);
    expect(mayArchive(me('member'), { by: 'Nico' })).toBe(false);
    expect(mayArchive(me('pm'), { by: 'Rina' })).toBe(true);
  });
});

test('every shared sample task has its Tasks extras', () => {
  expect(getTasksState().tasks.map((t) => [t.no, typeof t.updated, Array.isArray(t.tags)])).toEqual(
    TASKS.map((t) => [t.no, 'string', true]),
  );
});
