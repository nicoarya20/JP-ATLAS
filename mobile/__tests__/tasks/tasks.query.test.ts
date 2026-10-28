import {
  baseQuery,
  isFiltered,
  listParams,
  projectOfScope,
  queryStatuses,
  type TaskQuery,
} from '../../src/data/tasks.query';
import { getQuery, resetQueries, setQuery } from '../../src/data/tasks.query-state';

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

  test("a project's Tasks tab asks for that project, and Assignee Me for the signed-in account", () => {
    expect(listParams('project:p-atlas', q({ project: 'p-other', who: 1 }), '')).toBe(
      'scope=project&projectId=p-atlas&status=todo&status=in_progress&status=in_review' +
        '&assigneeId=u-nico&sort=due',
    );
    expect(listParams('project:p-atlas', q(), '')).not.toContain('assigneeId');
  });

  test('a sort the server does not have is refused', () => {
    expect(() => listParams('mine', q({ sort: 3 }), '')).toThrow('Cannot list tasks: no sort #3');
  });
});
