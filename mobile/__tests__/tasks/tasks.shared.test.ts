import { daysLate } from '../../src/data/tasks.shared';

test('how late, in words', () => {
  expect([daysLate(1), daysLate(3)]).toEqual(['1 day late', '3 days late']);
});
