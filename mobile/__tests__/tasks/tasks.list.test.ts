// The legacy path (tasks.ts getTasksList): a project's Tasks tab, which reads the sample store until Projects is wired.
// The Tasks tab itself reads the server: tasks.screen.list / tasks.screen.board.
import { resetArchive } from '../../src/data/archive.store';
import { getTasksList, type TasksList } from '../../src/data/tasks';
import { baseQuery } from '../../src/data/tasks.query';
import { resetQueries, setQuery } from '../../src/data/tasks.query-state';
import { getTasksState } from '../../src/data/tasks.state';
import { moveTask, resetTasks } from '../../src/data/tasks.store';

const ATLAS = 'project:atlas' as const;
const nos = (l: TasksList) =>
  l.view === 'list' ? l.groups.flatMap((g) => g.tasks.map((t) => t.no)) : [];
const columns = (l: TasksList) =>
  l.view === 'board' ? l.columns.map((c) => [c.status, c.cards.map((t) => t.no)]) : [];

afterEach(() => {
  resetTasks();
  resetArchive();
  resetQueries();
});

describe("a project's Tasks tab · list", () => {
  test('lists that project only, as one untitled group; an unknown project is refused', () => {
    const l = getTasksList('pm', { scope: ATLAS, view: 'list' });
    expect(l.view === 'list' && l.groups.map((g) => g.title)).toEqual([null]);
    expect(nos(l)).toEqual([12, 14, 17, 15, 16]);
    expect(nos(getTasksList('pm', { scope: 'project:sinar', view: 'list' }))).toEqual([9]);
    expect(() => getTasksList('pm', { scope: 'project:nope', view: 'list' })).toThrow(
      'Cannot list the tasks of project "nope": no such project',
    );
  });

  test('cards carry the viewer note, the due label, late flags, steps and the sample moves', () => {
    const l = getTasksList('pm', { scope: ATLAS, view: 'list' });
    const card = l.view === 'list' ? l.groups[0].tasks[0] : null;
    expect(card).toMatchObject({
      no: 12,
      id: null,
      whoLabel: 'Nico Pratama',
      note: '2 days overdue',
      due: 'Oct 5',
      late: true,
      lateOnBoard: true,
      lateBy: '2 days late',
      steps: '2/3',
      moves: ['To do', 'In review', 'Done'],
      denied: null,
    });
    const member = getTasksList('member', { scope: ATLAS, view: 'list' });
    const cards = member.view === 'list' ? member.groups[0].tasks : [];
    expect(cards.find((t) => t.no === 17)?.note).toBe('Awaiting review by Nico');
    expect(cards[0]).toMatchObject({
      no: 12,
      moves: [],
      denied: expect.stringMatching(/^Only Nico/),
    });
  });

  test('reads the query applied to its scope; search narrows by title, number or tag', () => {
    setQuery(ATLAS, { ...baseQuery(ATLAS), priority: 1 });
    expect(nos(getTasksList('pm', { scope: ATLAS, view: 'list' }))).toEqual([12]);
    const all = baseQuery(ATLAS);
    expect(
      nos(getTasksList('pm', { scope: ATLAS, view: 'list', query: all, search: 'sso' })),
    ).toEqual([12]);
  });

  test('a filter or search that empties it says noMatch; a canceled task needs the Canceled filter', () => {
    expect(getTasksList('pm', { scope: ATLAS, view: 'list', search: 'zzz' }).empty).toBe('noMatch');
    moveTask(14, 'Canceled');
    expect(nos(getTasksList('pm', { scope: ATLAS, view: 'list' }))).not.toContain(14);
    const canceled = { ...baseQuery(ATLAS), status: 5 };
    expect(nos(getTasksList('pm', { scope: ATLAS, view: 'list', query: canceled }))).toEqual([14]);
  });
});

describe("a project's Tasks tab · board", () => {
  test('All active keeps the Done column; a search that empties it says noMatch', () => {
    const b = getTasksList('pm', { scope: ATLAS, view: 'board' });
    expect(columns(b)).toEqual([
      ['To do', [14, 15, 16]],
      ['In progress', [12]],
      ['In review', [17]],
      ['Done', [8]],
    ]);
    expect(b.empty).toBeNull();
    expect(getTasksList('pm', { scope: ATLAS, view: 'board', search: 'zzz' }).empty).toBe(
      'noMatch',
    );
  });

  test('a Done card is not late on the board', () => {
    moveTask(12, 'Done');
    const b = getTasksList('pm', { scope: ATLAS, view: 'board' });
    const card = b.view === 'board' ? b.columns[3].cards.find((t) => t.no === 12) : null;
    expect(card).toMatchObject({ late: true, lateOnBoard: false });
  });

  test('the getter reads the state it is given', () => {
    const s = getTasksState();
    moveTask(15, 'Done');
    expect(columns(getTasksList('pm', { scope: ATLAS, view: 'board' }, s))[3][1]).toEqual([8]);
  });
});
