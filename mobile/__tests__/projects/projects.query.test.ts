// The project list's query as the server can answer it (listPath, isFiltered) and the dates the screens write.
import { addMonths, daysLeftLabel, rangeLabel } from '../../src/data/projects.dates';
import {
  BASE_QUERY,
  isFiltered,
  listPath,
  PROJECT_SEARCH_MAX,
} from '../../src/data/projects.query';

const params = (path: string) => Object.fromEntries(new URL(path, 'http://x').searchParams);

describe('listPath', () => {
  test('every project the viewer may see, nearest deadline first, one page', () => {
    expect(listPath(BASE_QUERY, 1, 25)).toBe(
      '/api/app/projects?scope=all&sort=due&page=1&limit=25',
    );
  });

  test('status, Needs attention (perhatian=1) and the name search, trimmed and capped', () => {
    const q = {
      status: 'on_hold',
      attention: true,
      sort: 'recent',
      q: ` ${'a'.repeat(120)} `,
    } as const;
    expect(params(listPath(q, 2, 50))).toEqual({
      scope: 'all',
      sort: 'recent',
      page: '2',
      limit: '50',
      status: 'on_hold',
      perhatian: '1',
      q: 'a'.repeat(PROJECT_SEARCH_MAX),
    });
  });

  test('a search is sent encoded; a blank one is not sent', () => {
    expect(params(listPath({ ...BASE_QUERY, q: 'R&D #2' }, 1, 25)).q).toBe('R&D #2');
    expect(listPath({ ...BASE_QUERY, q: '   ' }, 1, 25)).not.toContain('q=');
  });
});

describe('isFiltered', () => {
  test('a status or Needs attention narrows; the sort and the search do not light the dot', () => {
    expect(isFiltered(BASE_QUERY)).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, sort: 'name', q: 'atlas' })).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, status: 'completed' })).toBe(true);
    expect(isFiltered({ ...BASE_QUERY, attention: true })).toBe(true);
  });
});

describe('dates', () => {
  test('adds months, clamped to the month end', () => {
    expect(addMonths('2026-10-07', 1)).toBe('2026-11-07');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  test('labels ranges and days left', () => {
    expect(rangeLabel('2026-09-01', '2026-09-24')).toBe('Sep 1–24');
    expect(rangeLabel('2026-09-25', '2026-10-20')).toBe('Sep 25–Oct 20');
    expect(daysLeftLabel('2026-10-07', '2026-10-31')).toMatch(/24 days/);
  });
});
