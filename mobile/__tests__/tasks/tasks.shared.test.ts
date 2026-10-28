import { me } from '../../src/data/people';
import { TASKS } from '../../src/data/sample';
import { daysLate, deniedNotice, mayChange, note, whoLabel } from '../../src/data/tasks.shared';
import { getTasksState } from '../../src/data/tasks.state';

const task = (no: number) => {
  const t = getTasksState().tasks.find((x) => x.no === no);
  if (!t) throw new Error(`test-only: no sample task #${no}`);
  return t;
};

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

  test('how late, in words', () => {
    expect([daysLate(1), daysLate(3)]).toEqual(['1 day late', '3 days late']);
  });

  test('who label', () => {
    expect(whoLabel(task(12))).toBe('Nico Pratama');
    expect(whoLabel({ who: 'Rina', also: ['Dodi', 'Sri'] })).toBe('Rina Wulandari +2');
  });
});

describe('who may change', () => {
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
});

test('every shared sample task has its Tasks extras', () => {
  expect(getTasksState().tasks.map((t) => [t.no, typeof t.updated, Array.isArray(t.tags)])).toEqual(
    TASKS.map((t) => [t.no, 'string', true]),
  );
});
