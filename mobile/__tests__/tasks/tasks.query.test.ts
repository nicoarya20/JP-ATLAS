import {
  applyQuery,
  baseQuery,
  isFiltered,
  listParams,
  projectOfScope,
  queryStatuses,
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
  test('every list starts on every project, open tasks, by due date (no project default)', () => {
    expect(baseQuery('mine')).toEqual({ status: 0, project: '', priority: 0, sort: 0, who: 0 });
    expect(baseQuery('project:sinar').project).toBe('');
    expect(baseQuery('all').project).toBe('');
    expect(projectOfScope('project:sinar')).toBe('sinar');
    expect(projectOfScope('all')).toBeNull();
  });

  test('the sort alone does not count as a filter', () => {
    expect(isFiltered(baseQuery('mine'))).toBe(false);
    expect(isFiltered(q({ sort: 2 }))).toBe(false);
    expect(isFiltered(baseQuery('all'))).toBe(false);
    expect(isFiltered(q({ project: 'p-atlas' }))).toBe(true);
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
    expect(nos(applyQuery(all(), q({ project: 'atlas' }), { me: 'Nico' }))).not.toContain(9);
    expect(nos(applyQuery(all(), q({ project: 'sinar' }), { me: 'Nico' }))).toEqual([9]);
    expect(nos(applyQuery(all(), q({ priority: 1 }), { me: 'Nico' }))).toEqual([12]);
    expect(nos(applyQuery(all(), q({ who: 1 }), { me: 'Dodi' }))).toEqual([17, 16]);
  });

  test('the three sorts the server has too: due date, priority then due, recently updated (T-4)', () => {
    expect(nos(applyQuery(all(), q({ sort: 0 }), { me: 'Nico' }))).toEqual([12, 14, 17, 9, 15, 16]);
    expect(nos(applyQuery(all(), q({ sort: 1 }), { me: 'Nico' }))).toEqual([12, 14, 17, 9, 15, 16]);
    expect(nos(applyQuery(all(), q({ sort: 2 }), { me: 'Nico' }))).toEqual([12, 17, 9, 14, 15, 16]);
    expect(() => applyQuery(all(), q({ sort: 3 }), { me: 'Nico' })).toThrow('no sort #3');
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

describe('the request for /api/app/tasks', () => {
  test('All active asks for the three open statuses; a status filter for its own', () => {
    expect(queryStatuses(q())).toEqual(['todo', 'in_progress', 'in_review']);
    expect(queryStatuses(q({ status: 4 }))).toEqual(['done']);
    expect(queryStatuses(q({ status: 5 }))).toEqual(['canceled']);
  });

  test('one fixed order: scope, project, statuses, priority, search, sort', () => {
    expect(listParams('mine', q(), '')).toBe(
      'scope=mine&status=todo&status=in_progress&status=in_review&sort=due',
    );
    expect(listParams('all', q({ project: 'p-1', priority: 1, sort: 1 }), '  #12 ')).toBe(
      'scope=all&projectId=p-1&status=todo&status=in_progress&status=in_review&priority=high' +
        '&q=%2312&sort=priority',
    );
    expect(listParams('all', q({ sort: 2 }), 'a&b', ['done'])).toBe(
      'scope=all&status=done&q=a%26b&sort=updated',
    );
  });

  test('a sort the server does not have is refused', () => {
    expect(() => listParams('mine', q({ sort: 3 }), '')).toThrow('Cannot list tasks: no sort #3');
  });
});
