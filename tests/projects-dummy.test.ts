/** Filtering and sorting of the dummy project list, plus data sanity for the Proyek page. */
import { describe, expect, it } from 'bun:test';
import { PROJECTS } from '../app/components/projects/projects.dummy';
import { filterProjects } from '../app/components/projects/projects.filter';
import { PROJECT_CONDITIONS, PROJECT_STATUSES } from '../server/pm/enums';

const names = (rows: { name: string }[]) => rows.map((r) => r.name);

describe('projects dummy data', () => {
  it('uses known statuses and conditions and consistent progress', () => {
    for (const p of PROJECTS) {
      expect(PROJECT_STATUSES).toContain(p.status);
      expect(PROJECT_CONDITIONS).toContain(p.condition);
      expect(p.done).toBeLessThanOrEqual(p.total);
      expect(p.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('filterProjects', () => {
  it('sorts by nearest due date by default', () => {
    expect(names(filterProjects(PROJECTS, '', 'all', 'due'))[0]).toBe('Migrasi Data Lama');
  });

  it('matches the search text against name and lead, case-insensitively', () => {
    expect(names(filterProjects(PROJECTS, 'SINAR', 'all', 'due'))).toEqual([
      'Portal Klien PT Sinar',
    ]);
    expect(names(filterProjects(PROJECTS, 'dodi', 'all', 'due'))).toEqual(['Migrasi Data Lama']);
  });

  it('"attention" keeps only projects that are not on track', () => {
    expect(filterProjects(PROJECTS, '', 'attention', 'due')).toHaveLength(3);
  });

  it('returns nothing for a status no project has', () => {
    expect(filterProjects(PROJECTS, '', 'draft', 'due')).toEqual([]);
  });

  it('sorts by progress, highest first, without mutating the source', () => {
    const before = names(PROJECTS);
    expect(names(filterProjects(PROJECTS, '', 'all', 'progress'))[0]).toBe('Migrasi Data Lama');
    expect(names(PROJECTS)).toEqual(before);
  });
});
