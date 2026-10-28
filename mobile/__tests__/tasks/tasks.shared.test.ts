import { TASKS } from '../../src/data/sample';
import { daysLate } from '../../src/data/tasks.shared';
import { getTasksState } from '../../src/data/tasks.state';

test('how late, in words', () => {
  expect([daysLate(1), daysLate(3)]).toEqual(['1 day late', '3 days late']);
});

test('every shared sample task has its Tasks extras', () => {
  expect(getTasksState().tasks.map((t) => [t.no, typeof t.updated, Array.isArray(t.tags)])).toEqual(
    TASKS.map((t) => [t.no, 'string', true]),
  );
});
