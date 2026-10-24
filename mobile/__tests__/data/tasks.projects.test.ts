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
import { getQuickWrite, getTaskSettings } from '../../src/data/tasks';
import { formProjects, getTaskForm } from '../../src/data/tasks.form';
import { applyQuery, baseQuery } from '../../src/data/tasks.query';
import { getTask, getTasksState } from '../../src/data/tasks.state';
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
});

/** Rename sample project `id`, keeping its other fields. */
function rename(id: string, name: string) {
  const p = findProject(id);
  if (!p) throw new Error(`test-only: no sample project ${id}`);
  const fields: ProjectFields = { ...p, name };
  editProject(id, fields, 'Nico');
}

describe('a renamed project', () => {
  test('its tasks still show under the project filter, by id', () => {
    const before = applyQuery(getTasksState().tasks, baseQuery('all'), { me: 'Nico' }).length;
    expect(before).toBeGreaterThan(0);
    rename('atlas', 'Atlas v2');
    const after = applyQuery(getTasksState().tasks, baseQuery('all'), { me: 'Nico' });
    expect(after).toHaveLength(before);
    expect(after.every((t) => t.project === 'Atlas v2')).toBe(true);
  });

  test('the forms, Project settings and Just write name it by its new name', () => {
    rename('atlas', 'Atlas v2');
    expect(getTaskForm('pm', 'atlas').project.name).toBe('Atlas v2');
    const settings = getTaskSettings('pm', 'atlas');
    expect(settings.allowed && settings.project).toBe('Atlas v2');
    expect(getQuickWrite().project).toBe('Atlas v2');
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
