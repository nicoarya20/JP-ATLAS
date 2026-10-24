import { toUtc } from '../../src/data/dates';

describe('toUtc', () => {
  test('parses an ISO date as midnight UTC', () => {
    const d = toUtc('2026-10-07');
    expect(d.toISOString()).toBe('2026-10-07T00:00:00.000Z');
    expect([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]).toEqual([2026, 9, 7]);
  });

  test.each(['2026-10-7', '07-10-2026', '2026-10-07T09:41', ''])('rejects %p', (bad) => {
    expect(() => toUtc(bad)).toThrow(`Not an ISO date (YYYY-MM-DD): ${bad}`);
  });
});
