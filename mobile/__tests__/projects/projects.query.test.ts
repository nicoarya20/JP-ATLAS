// Projects query, people row and dates (port of prototype projects.query.test / projects.people.test).
import { addMonths, daysLeftLabel, rangeLabel } from '../../src/data/projects.dates';
import { ofWho, teammates, WHO_ME, whoLabel } from '../../src/data/projects.people';
import { applyQuery, BASE_QUERY, isFiltered, searchProjects } from '../../src/data/projects.query';
import { listProjects } from '../../src/data/projects.store';

const ids = (list: readonly { id: string }[]) => list.map((p) => p.id);

describe('applyQuery', () => {
  it('sorts by the nearest deadline by default', () => {
    expect(ids(applyQuery(listProjects(), BASE_QUERY))).toEqual([
      'website',
      'migration',
      'sinar',
      'atlas',
      'attendance',
      'tools',
    ]);
  });

  it('filters by status and by health ("! Needs attention" matches Needs attention)', () => {
    expect(ids(applyQuery(listProjects(), { ...BASE_QUERY, status: 2 }))).toEqual(['tools']);
    expect(ids(applyQuery(listProjects(), { ...BASE_QUERY, health: 1 }))).toEqual([
      'sinar',
      'atlas',
    ]);
  });

  it('sorts by lowest progress and by name', () => {
    expect(ids(applyQuery(listProjects(), { ...BASE_QUERY, sort: 1 }))[0]).toBe('attendance');
    expect(ids(applyQuery(listProjects(), { ...BASE_QUERY, sort: 2 }))[0]).toBe('atlas');
  });

  it('only status and health count as filtered', () => {
    expect(isFiltered({ ...BASE_QUERY, sort: 2 })).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, health: 2 })).toBe(true);
  });

  it('searches the name, case-insensitive; blank keeps all', () => {
    expect(ids(searchProjects(listProjects(), 'ATLAS'))).toEqual(['atlas']);
    expect(searchProjects(listProjects(), '  ')).toHaveLength(6);
  });
});

describe('people row', () => {
  it('My projects are the ones I am in; a teammate pick shows theirs', () => {
    expect(ids(ofWho(listProjects(), WHO_ME, 'Dodi'))).toEqual(['atlas', 'migration', 'tools']);
    expect(ids(ofWho(listProjects(), 'Lea', 'Nico'))).toEqual(['sinar', 'website']);
    expect(teammates(listProjects(), 'Nico')).not.toContain('Nico');
  });

  it('names the pick; a Member sees shared projects', () => {
    expect(whoLabel(WHO_ME, false)).toBe('My projects');
    expect(whoLabel('Rina', false)).toBe("Rina's projects");
    expect(whoLabel('Rina', true)).toBe('Projects with Rina');
  });
});

describe('dates', () => {
  it('adds months, clamped to the month end', () => {
    expect(addMonths('2026-10-07', 1)).toBe('2026-11-07');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('labels ranges and days left', () => {
    expect(rangeLabel('2026-09-01', '2026-09-24')).toBe('Sep 1–24');
    expect(rangeLabel('2026-09-25', '2026-10-20')).toBe('Sep 25–Oct 20');
    expect(daysLeftLabel('2026-10-07', '2026-10-31')).toMatch(/24 days/);
  });
});
