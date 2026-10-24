import {
  applyQuery,
  baseQuery,
  isFiltered,
  projectOfScope,
  searchTasks,
  type TaskQuery,
} from '../../src/data/tasks.query';
import { getQuery, resetQueries, setQuery } from '../../src/data/tasks.query-state';
import { getTasksState } from '../../src/data/tasks.state';

// Sample tasks on the prototype's "today", Wed Oct 7 2026; Nico (pm) is the viewer unless stated.

const all = () => getTasksState().tasks;
const nos = (list: readonly { no: number }[]) => list.map((t) => t.no);
const q = (patch: Partial<TaskQuery> = {}): TaskQuery => ({ ...baseQuery('mine'), ...patch });

describe('baseQuery and isFiltered', () => {
  test('My tasks and a project tab span every project; All tasks starts on Atlas', () => {
    expect(baseQuery('mine')).toEqual({ status: 0, project: '', priority: 0, sort: 0, who: 0 });
    expect(baseQuery('project:sinar').project).toBe('');
    expect(baseQuery('all').project).toBe('atlas');
    expect(projectOfScope('project:sinar')).toBe('sinar');
    expect(projectOfScope('all')).toBeNull();
  });

  test('the sort alone does not count as a filter', () => {
    expect(isFiltered(baseQuery('mine'))).toBe(false);
    expect(isFiltered(q({ sort: 3 }))).toBe(false);
    expect(isFiltered(baseQuery('all'))).toBe(true);
    expect(isFiltered(q({ status: 4 }))).toBe(true);
    expect(isFiltered(q({ priority: 1 }))).toBe(true);
    expect(isFiltered(q({ who: 1 }))).toBe(true);
  });
});

describe('applyQuery', () => {
  test('All active hides Done and Canceled on the lists but not on the board', () => {
    expect(nos(applyQuery(all(), q(), { me: 'Nico' }))).not.toContain(8);
    expect(nos(applyQuery(all(), q(), { board: true, me: 'Nico' }))).toContain(8);
    expect(nos(applyQuery(all(), q({ status: 4 }), { me: 'Nico' }))).toEqual([8]);
  });

  test('project, priority and assignee filters', () => {
    expect(nos(applyQuery(all(), baseQuery('all'), { me: 'Nico' }))).not.toContain(9);
    expect(nos(applyQuery(all(), q({ project: 'sinar' }), { me: 'Nico' }))).toEqual([9]);
    expect(nos(applyQuery(all(), q({ priority: 1 }), { me: 'Nico' }))).toEqual([12]);
    expect(nos(applyQuery(all(), q({ who: 1 }), { me: 'Dodi' }))).toEqual([17, 16]);
  });

  test('the four sorts: due date, priority then due, recently updated, title', () => {
    expect(nos(applyQuery(all(), q({ sort: 0 }), { me: 'Nico' }))).toEqual([12, 14, 17, 9, 15, 16]);
    expect(nos(applyQuery(all(), q({ sort: 1 }), { me: 'Nico' }))).toEqual([12, 14, 17, 9, 15, 16]);
    expect(nos(applyQuery(all(), q({ sort: 2 }), { me: 'Nico' }))).toEqual([12, 17, 9, 14, 15, 16]);
    expect(nos(applyQuery(all(), q({ sort: 3 }), { me: 'Nico' }))).toEqual([12, 17, 16, 9, 15, 14]);
  });

  test('an unknown sort is refused', () => {
    expect(() => applyQuery(all(), q({ sort: 9 }), { me: 'Nico' })).toThrow(
      'Cannot sort tasks: no sort #9',
    );
  });
});

describe('searchTasks', () => {
  test('matches title, #number or tag, ignoring case; blank keeps all', () => {
    expect(nos(searchTasks(all(), 'sso'))).toEqual([12]);
    expect(nos(searchTasks(all(), 'PROFILE'))).toEqual([17]);
    expect(nos(searchTasks(all(), '#14'))).toEqual([14]);
    expect(nos(searchTasks(all(), '16'))).toEqual([16]);
    expect(nos(searchTasks(all(), 'design'))).toEqual([15, 8]);
    expect(searchTasks(all(), '   ')).toHaveLength(all().length);
  });
});

describe('query per scope', () => {
  afterEach(resetQueries);

  test('a scope reads its default until a query is applied, without touching other scopes', () => {
    expect(getQuery('all')).toEqual(baseQuery('all'));
    setQuery('all', q({ status: 4 }));
    expect(getQuery('all').status).toBe(4);
    expect(getQuery('mine')).toEqual(baseQuery('mine'));
  });
});
