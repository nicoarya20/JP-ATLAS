// Projects store (W4): edit carries a new name to the tasks, member roles keep the Lead, Archive takes the tasks along
// and Undo puts them back, Delete forever ends the Undo, reset brings the sample back. W4e: no two projects share a name.
import { findEntry, listEntries, resetArchive } from '../../src/data/archive.store';
import {
  archiveProject,
  canRestoreProject,
  editProject,
  findProject,
  getProjectByName,
  isArchivedProject,
  listArchivedProjects,
  listProjects,
  projectNameTaken,
  removeMember,
  resetProjects,
  restoreProject,
  setMemberRole,
  taskCountOf,
} from '../../src/data/projects.store';
import { getTasksState, resetTasks } from '../../src/data/tasks.store';

afterEach(() => {
  resetProjects();
  resetTasks();
  resetArchive();
});

const ids = (list: readonly { id: string }[]) => list.map((p) => p.id);
const tasksOf = (project: string) => getTasksState().tasks.filter((t) => t.project === project);

function atlasFields() {
  const p = findProject('atlas');
  if (!p) throw new Error('sample project atlas is missing');
  const { name, desc, lead, status, priority, due } = p;
  return { name, desc, lead, status, priority, due, started: p.started };
}

describe('getters', () => {
  it('finds a project by id and by name, and counts its listed tasks', () => {
    expect(findProject('atlas')?.name).toBe('Atlas Project');
    expect(getProjectByName('Atlas Project')?.id).toBe('atlas');
    expect(listProjects()).toHaveLength(6);
    expect(taskCountOf('atlas')).toBe(tasksOf('Atlas Project').length);
    expect(taskCountOf('atlas')).toBeGreaterThan(0);
  });

  it('throws with the id when counting the tasks of an unknown project', () => {
    expect(() => taskCountOf('nope')).toThrow('Cannot count the tasks of project "nope"');
  });
});

describe('editProject', () => {
  it("refuses another project's name, in any case and padded, also one in Archive; its own name is fine", () => {
    const taken = /Cannot edit project "atlas": another project is already named "internal tools"/;
    expect(() =>
      editProject('atlas', { ...atlasFields(), name: ' internal tools ' }, 'Nico'),
    ).toThrow(taken);
    expect(findProject('atlas')?.name).toBe('Atlas Project');
    expect(projectNameTaken('ATLAS PROJECT', 'atlas')).toBe(false);
    expect(() =>
      editProject('atlas', { ...atlasFields(), name: 'atlas project' }, 'Nico'),
    ).not.toThrow();
    archiveProject('tools', 'Nico');
    expect(projectNameTaken('Internal Tools', 'atlas')).toBe(true);
  });

  it('saves the fields, logs the edit and renames the project on its tasks', () => {
    const before = tasksOf('Atlas Project').length;
    editProject('atlas', { ...atlasFields(), name: '  Atlas v2 ' }, 'Nico');
    expect(findProject('atlas')?.name).toBe('Atlas v2');
    expect(tasksOf('Atlas Project')).toHaveLength(0);
    expect(tasksOf('Atlas v2')).toHaveLength(before);
    expect(getProjectByName('Atlas v2')?.id).toBe('atlas');
  });

  it('refuses a blank name or a Lead from outside the project', () => {
    expect(() => editProject('atlas', { ...atlasFields(), name: ' ' }, 'Nico')).toThrow(
      'the name is blank',
    );
    expect(() => editProject('atlas', { ...atlasFields(), lead: 'Lea' }, 'Nico')).toThrow(
      'Lead Lea is not a member',
    );
  });

  it('makes a new Lead Manager', () => {
    editProject('atlas', { ...atlasFields(), lead: 'Rina' }, 'Nico');
    expect(findProject('atlas')?.roles.Rina).toBe('Manager');
  });
});

describe('members', () => {
  it('changes a role and removes a member, but the Lead stays Manager and stays in', () => {
    setMemberRole('atlas', 'Dodi', 'Viewer');
    expect(findProject('atlas')?.roles.Dodi).toBe('Viewer');
    removeMember('atlas', 'Dodi');
    expect(findProject('atlas')?.members).not.toContain('Dodi');
    expect(() => setMemberRole('atlas', 'Nico', 'Member')).toThrow('stays Manager');
    expect(() => removeMember('atlas', 'Nico')).toThrow('the Lead of "atlas" stays');
    expect(() => removeMember('atlas', 'Lea')).toThrow('not in "atlas"');
  });
});

describe('archive', () => {
  it('moves the project and its tasks to Archive, and Undo brings both back in place', () => {
    const count = taskCountOf('atlas');
    const key = archiveProject('atlas', 'Nico');
    // still found (its tasks in Archive name it), but no longer listed
    expect(findProject('atlas')?.name).toBe('Atlas Project');
    expect(ids(listProjects())).not.toContain('atlas');
    expect(isArchivedProject('atlas')).toBe(true);
    expect(listArchivedProjects().map((p) => p.id)).toEqual(['atlas']);
    expect(tasksOf('Atlas Project')).toHaveLength(0);
    expect(findEntry(key)).toMatchObject({ kind: 'PROJECT', ref: 'atlas', by: 'Nico' });
    expect(findEntry(key)?.includes).toBe(`${count} tasks`);
    expect(canRestoreProject('atlas', key)).toBe(true);

    restoreProject('atlas', key);
    expect(listProjects()[0]?.id).toBe('atlas');
    expect(tasksOf('Atlas Project')).toHaveLength(count);
    expect(findEntry(key)).toBeUndefined();
    expect(isArchivedProject('atlas')).toBe(false);
  });

  it('resetProjects brings the sample back', () => {
    archiveProject('atlas', 'Nico');
    resetProjects();
    resetArchive();
    expect(ids(listProjects())).toContain('atlas');
    expect(listEntries().some((e) => e.ref === 'atlas')).toBe(false);
  });
});
