import { resetArchive } from '../../src/data/archive.store';
import { getTasksList, type TasksList } from '../../src/data/tasks';
import { baseQuery } from '../../src/data/tasks.query';
import { resetQueries, resetQuery, setQuery } from '../../src/data/tasks.query-state';
import { getTasksState } from '../../src/data/tasks.state';
import { archiveTask, moveTask, resetTasks } from '../../src/data/tasks.store';

const groups = (l: TasksList): [string | null, number[]][] =>
  l.view === 'list' ? l.groups.map((g) => [g.title, g.tasks.map((t) => t.no)]) : [];
const columns = (l: TasksList) =>
  l.view === 'board' ? l.columns.map((c) => [c.status, c.cards.map((t) => t.no)]) : [];

afterEach(() => {
  resetTasks();
  resetArchive();
  resetQueries();
});

describe('getTasksList · list', () => {
  test('My tasks for a Manager: review queue, then urgency groups', () => {
    const l = getTasksList('pm', { scope: 'mine', view: 'list' });
    expect(groups(l)).toEqual([
      ['Waiting for my review', [17]],
      ['Overdue', [12]],
      ['Today', [14]],
      ['Tomorrow', [9]],
    ]);
    expect(l.filtered).toBe(false);
    expect(l.empty).toBeNull();
  });

  test('All tasks starts on Atlas (dot on the filter) and leaves out PT Sinar', () => {
    const l = getTasksList('pm', { scope: 'all', view: 'list' });
    expect(l.filtered).toBe(true);
    expect(groups(l)).toEqual([[null, [12, 14, 17, 15, 16]]]);
  });

  test('cards carry the viewer note, the due label, late flags and steps', () => {
    const l = getTasksList('pm', { scope: 'all', view: 'list' });
    const card = l.view === 'list' ? l.groups[0].tasks[0] : null;
    expect(card).toMatchObject({
      no: 12,
      whoLabel: 'Nico Pratama',
      note: '2 days overdue',
      due: 'Oct 5',
      late: true,
      lateOnBoard: true,
      steps: '2/3',
      mayChange: true,
    });
    const member = getTasksList('member', { scope: 'all', view: 'list' });
    const n17 = member.view === 'list' ? member.groups[0].tasks.find((t) => t.no === 17) : null;
    expect(n17?.note).toBe('Awaiting review by Nico');
    expect(member.view === 'list' && member.groups[0].tasks[0].mayChange).toBe(false);
  });

  test('a scope reads the query applied to it; search narrows by title, number or tag', () => {
    setQuery('all', { ...baseQuery('all'), project: '' });
    expect(groups(getTasksList('pm', { scope: 'all', view: 'list' }))[0][1]).toContain(9);
    resetQuery('all');
    expect(groups(getTasksList('pm', { scope: 'all', view: 'list', search: 'sso' }))).toEqual([
      [null, [12]],
    ]);
  });

  test('empty states: none for a Member without tasks, noMatch when a filter or search empties it', () => {
    archiveTask(17, 'Nico');
    archiveTask(16, 'Nico');
    expect(getTasksList('member', { scope: 'mine', view: 'list' }).empty).toBe('none');
    resetTasks();
    const done = { ...baseQuery('mine'), status: 5 };
    expect(getTasksList('pm', { scope: 'mine', view: 'list', query: done }).empty).toBe('noMatch');
    expect(getTasksList('pm', { scope: 'mine', view: 'list', search: 'zzz' }).empty).toBe(
      'noMatch',
    );
    expect(getTasksList('pm', { scope: 'all', view: 'list', search: 'zzz' }).empty).toBe('noMatch');
  });

  test('a board stays as empty columns unless a filter or search empties it (then noMatch)', () => {
    archiveTask(17, 'Nico');
    archiveTask(16, 'Nico');
    expect(getTasksList('member', { scope: 'mine', view: 'board' }).empty).toBeNull();
    resetTasks();
    expect(getTasksList('pm', { scope: 'mine', view: 'board', search: 'zzz' }).empty).toBe(
      'noMatch',
    );
    expect(getTasksList('pm', { scope: 'mine', view: 'board', search: 'sso' }).empty).toBeNull();
  });

  test('a past-due card says how late, beside its red date', () => {
    const list = getTasksList('pm', { scope: 'mine', view: 'list' });
    const cards = list.view === 'list' ? list.groups.flatMap((g) => g.tasks) : [];
    const late = cards.find((c) => c.no === 12);
    expect(late).toMatchObject({ late: true, lateOnBoard: true, lateBy: '2 days late' });
    expect(cards.find((c) => c.no === 14)).toMatchObject({ late: false, lateBy: null });
  });

  test('a canceled task leaves the default lists; the Canceled filter shows it', () => {
    moveTask(14, 'Canceled');
    expect(
      groups(getTasksList('pm', { scope: 'mine', view: 'list' })).flatMap((g) => g[1]),
    ).not.toContain(14);
    const canceled = { ...baseQuery('mine'), status: 5 };
    expect(groups(getTasksList('pm', { scope: 'mine', view: 'list', query: canceled }))).toEqual([
      ['Canceled', [14]],
    ]);
  });

  test('a project tab lists that project only; an unknown project is refused', () => {
    expect(groups(getTasksList('pm', { scope: 'project:sinar', view: 'list' }))).toEqual([
      [null, [9]],
    ]);
    expect(() => getTasksList('pm', { scope: 'project:nope', view: 'list' })).toThrow(
      'Cannot list the tasks of project "nope": no such project',
    );
  });
});

describe('getTasksList · board', () => {
  test('All active keeps the Done column; My board holds only my tasks', () => {
    const all = getTasksList('pm', { scope: 'all', view: 'board' });
    expect(columns(all)).toEqual([
      ['To do', [14, 15, 16]],
      ['In progress', [12]],
      ['In review', [17]],
      ['Done', [8]],
    ]);
    expect(all.empty).toBeNull();
    expect(columns(getTasksList('member', { scope: 'mine', view: 'board' }))).toEqual([
      ['To do', [16]],
      ['In progress', []],
      ['In review', [17]],
      ['Done', []],
    ]);
  });

  test('a Done card is not late on the board', () => {
    moveTask(12, 'Done');
    const b = getTasksList('pm', { scope: 'all', view: 'board' });
    const card = b.view === 'board' ? b.columns[3].cards.find((t) => t.no === 12) : null;
    expect(card).toMatchObject({ late: true, lateOnBoard: false });
  });

  test('the getter reads the state it is given', () => {
    const s = getTasksState();
    moveTask(15, 'Done');
    expect(columns(getTasksList('pm', { scope: 'all', view: 'board' }, s))[3][1]).toEqual([8]);
  });
});
