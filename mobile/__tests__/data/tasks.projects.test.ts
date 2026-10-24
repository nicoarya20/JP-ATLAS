// Tasks read projects from the projects store (W4b): a renamed project keeps its tasks, an archived one takes no new
// tasks, and a project deleted forever takes the tasks it carried into Archive with it.
import { resetArchive } from '../../src/data/archive.store';
import {
  archiveProject,
  editProject,
  findProject,
  type ProjectFields,
  resetProjects,
} from '../../src/data/projects.store';
import { getQuickWrite, getTaskSettings, getTasksList } from '../../src/data/tasks';
import { formProjects, getTaskForm } from '../../src/data/tasks.form';
import { applyQuery, baseQuery, withListedProject } from '../../src/data/tasks.query';
import { defaultQuery, getQuery, resetQueries, setQuery } from '../../src/data/tasks.query-state';
import { getTask, getTasksState, taskInfo } from '../../src/data/tasks.state';
import {
  forgetProjectTasks,
  putTasksBack,
  resetTasks,
  takeProjectTasks,
} from '../../src/data/tasks.store';

afterEach(() => {
  resetProjects();
  resetTasks();
  resetArchive();
  resetQueries();
});

/** Save Edit project for sample project `id` with `change` over its fields. */
function edit(id: string, change: Partial<ProjectFields>) {
  const p = findProject(id);
  if (!p) throw new Error(`test-only: no sample project ${id}`);
  const fields: ProjectFields = { ...p, ...change };
  editProject(id, fields, 'Nico');
}
const rename = (id: string, name: string) => edit(id, { name });

const projectTab = () => getTasksList('pm', { scope: 'project:atlas', view: 'list' });
const listed = (l: ReturnType<typeof projectTab>) =>
  l.view === 'list' ? l.groups.flatMap((g) => g.tasks) : [];

describe('a renamed project', () => {
  test('its tasks still show under the project filter, by id', () => {
    const before = applyQuery(getTasksState().tasks, baseQuery('all'), { me: 'Nico' }).length;
    expect(before).toBeGreaterThan(0);
    rename('atlas', 'Atlas v2');
    const after = applyQuery(getTasksState().tasks, baseQuery('all'), { me: 'Nico' });
    expect(after).toHaveLength(before);
    expect(after.every((t) => t.project === 'Atlas v2')).toBe(true);
  });

  test("the project's Tasks tab keeps its tasks", () => {
    const before = listed(projectTab()).length;
    expect(before).toBeGreaterThan(0);
    rename('atlas', 'Atlas v2');
    expect(listed(projectTab())).toHaveLength(before);
  });

  test('the forms, Project settings and Just write name it by its new name', () => {
    rename('atlas', 'Atlas v2');
    expect(getTaskForm('pm', 'atlas').project.name).toBe('Atlas v2');
    const settings = getTaskSettings('pm', 'atlas');
    expect(settings.allowed && settings.project).toBe('Atlas v2');
    expect(getQuickWrite().project).toBe('Atlas v2');
  });
});

describe('a new Lead', () => {
  test('is who created a task that has no history of its own', () => {
    const s = getTasksState();
    const plain = s.tasks.find((t) => t.project === 'Atlas Project' && !s.info[t.no]);
    if (!plain) throw new Error('test-only: every Atlas sample task has extras');
    expect(taskInfo(s, plain.no).by).toBe('Nico');
    edit('atlas', { lead: 'Rina' });
    expect(taskInfo(getTasksState(), plain.no)).toMatchObject({
      by: 'Rina',
      history: [{ text: 'Rina created this task', on: null }],
    });
  });
});

describe('an archived project', () => {
  test('is not offered in New task, for an Admin either', () => {
    expect(formProjects('admin').map((p) => p.id)).toContain('atlas');
    archiveProject('atlas', 'Ayu');
    expect(formProjects('admin').map((p) => p.id)).not.toContain('atlas');
    // Opening New task on it falls back to another project.
    expect(getTaskForm('admin', 'atlas').project.id).not.toBe('atlas');
  });
});

describe('forgetProjectTasks', () => {
  test('the tasks a project took along are gone for good and cannot come back', () => {
    const taken = takeProjectTasks('Atlas Project');
    expect(taken.length).toBeGreaterThan(0);
    const [first] = taken;
    expect(getTask(first.no)).toBeDefined();
    forgetProjectTasks(taken);
    expect(getTask(first.no)).toBeUndefined();
    expect(getTasksState().archived.some((t) => taken.some((x) => x.no === t.no))).toBe(false);
    expect(() => putTasksBack(taken)).toThrow(`Cannot put task #${first.no} back`);
  });

  test('refuses tasks that are still listed, saying which', () => {
    const listed = getTasksState().tasks[0];
    expect(() => forgetProjectTasks([{ at: 0, no: listed.no }])).toThrow(
      `Cannot forget task #${listed.no}: it is not out of the lists`,
    );
    expect(getTask(listed.no)).toBeDefined();
  });
});

describe('a query on a project moved to Archive (W4g)', () => {
  test('All tasks on Atlas falls back to the default project; the other filters stay', () => {
    setQuery('all', { ...baseQuery('all'), status: 2, priority: 1, sort: 3 });
    archiveProject('atlas', 'Ayu');
    // Atlas is the default of All tasks too, so it falls back to every project.
    expect(getQuery('all')).toEqual({ status: 2, project: '', priority: 1, sort: 3, who: 0 });
    expect(defaultQuery('all').project).toBe('');
  });

  test('another archived project gives way to Atlas, the default of All tasks', () => {
    setQuery('all', { ...baseQuery('all'), project: 'migration', priority: 2 });
    archiveProject('migration', 'Ayu');
    expect(getQuery('all')).toMatchObject({ project: 'atlas', priority: 2 });
  });

  test('a listed project is kept as is', () => {
    const q = { ...baseQuery('mine'), project: 'migration' };
    expect(withListedProject(q, 'mine')).toBe(q);
  });
});
