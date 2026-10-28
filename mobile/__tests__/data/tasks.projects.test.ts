// Tasks read projects from the projects store (W4b): a renamed project keeps its tasks, and a project deleted forever takes the tasks it carried into Archive with it.
import { resetArchive } from '../../src/data/archive.store';
import {
  editProject,
  findProject,
  type ProjectFields,
  resetProjects,
} from '../../src/data/projects.store';
import { getQuickWrite, getTaskSettings, getTasksList } from '../../src/data/tasks';
import { applyQuery, baseQuery } from '../../src/data/tasks.query';
import { resetQueries } from '../../src/data/tasks.query-state';
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
    const onAtlas = { ...baseQuery('project:atlas'), project: 'atlas' };
    const before = applyQuery(getTasksState().tasks, onAtlas, { me: 'Nico' }).length;
    expect(before).toBeGreaterThan(0);
    rename('atlas', 'Atlas v2');
    const after = applyQuery(getTasksState().tasks, onAtlas, { me: 'Nico' });
    expect(after).toHaveLength(before);
    expect(after.every((t) => t.project === 'Atlas v2')).toBe(true);
  });

  test("the project's Tasks tab keeps its tasks", () => {
    const before = listed(projectTab()).length;
    expect(before).toBeGreaterThan(0);
    rename('atlas', 'Atlas v2');
    expect(listed(projectTab())).toHaveLength(before);
  });

  test('Project settings and Just write name it by its new name', () => {
    rename('atlas', 'Atlas v2');
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
