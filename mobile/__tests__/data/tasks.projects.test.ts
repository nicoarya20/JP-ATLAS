// The sample task screens read projects from the projects store (W4b): a renamed project keeps its name there.
import { resetArchive } from '../../src/data/archive.store';
import {
  editProject,
  findProject,
  type ProjectFields,
  resetProjects,
} from '../../src/data/projects.store';
import { getQuickWrite, getTaskSettings } from '../../src/data/tasks';
import { getTasksState, taskInfo } from '../../src/data/tasks.state';
import { resetTasks } from '../../src/data/tasks.store';

afterEach(() => {
  resetProjects();
  resetTasks();
  resetArchive();
});

/** Save Edit project for sample project `id` with `change` over its fields. */
function edit(id: string, change: Partial<ProjectFields>) {
  const p = findProject(id);
  if (!p) throw new Error(`test-only: no sample project ${id}`);
  const fields: ProjectFields = { ...p, ...change };
  editProject(id, fields, 'Nico');
}
const rename = (id: string, name: string) => edit(id, { name });

describe('a renamed project', () => {
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
