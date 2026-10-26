import { resetArchive } from '../../src/data/archive.store';
import { PROJECTS } from '../../src/data/sample';
import { getTaskDetail } from '../../src/data/tasks';
import {
  addTag,
  canSave,
  getTaskEdit,
  getTaskForm,
  phasesOf,
  pickProject,
  reviewerName,
  reviewersOf,
  saveNewTask,
  saveTaskEdit,
  shownReviewer,
  type TaskForm,
} from '../../src/data/tasks.form';
import { getTaskSettings } from '../../src/data/tasks.settings';
import { getTasksState } from '../../src/data/tasks.state';
import { getTask, resetTasks, taskInfo } from '../../src/data/tasks.store';
import { getCsvImport, getQuickWrite } from '../../src/data/tasks.write';

const project = (id: string) => {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) throw new Error(`test-only: no project ${id}`);
  return p;
};
const editForm = (role: 'member' | 'pm' | 'admin', no: number): TaskForm => {
  const v = getTaskEdit(role, no);
  if (!v?.allowed) throw new Error(`test-only: ${role} may not edit #${no}`);
  return v.initial;
};

afterEach(() => {
  resetTasks();
  resetArchive();
});

describe('form pickers', () => {
  test('reviewers are the project Managers and every Admin, never an assignee', () => {
    expect(reviewersOf(project('atlas'), ['Dodi'])).toEqual([
      { value: 'Nico', label: 'Nico Pratama · Manager' },
      { value: 'Ayu', label: 'Ayu Lestari · Admin' },
    ]);
    expect(reviewersOf(project('atlas'), ['Nico']).map((o) => o.value)).toEqual(['Ayu']);
    expect(reviewerName('Ayu')).toBe('Ayu (Admin)');
    expect(reviewerName('Rina')).toBeUndefined();
    expect(shownReviewer(reviewersOf(project('atlas'), ['Nico']), 'Nico')).toBe('Ayu');
  });

  test('tags are lowercase without duplicates; Save needs a title and an assignee', () => {
    expect(addTag(['sso'], ' Login ')).toEqual(['sso', 'login']);
    expect(addTag(['sso'], 'SSO')).toEqual(['sso']);
    expect(addTag(['sso'], '  ')).toEqual(['sso']);
    expect(canSave({ title: ' ', who: ['Nico'] })).toBe(false);
    expect(canSave({ title: 'x', who: [] })).toBe(false);
    expect(canSave({ title: 'x', who: ['Nico'] })).toBe(true);
    expect(phasesOf('atlas')?.map((o) => o.label)).toEqual([
      'No phase',
      'Planning',
      'Development',
      'Testing',
      'Release',
    ]);
    expect(phasesOf('sinar')).toBeNull();
  });
});

describe('Edit task', () => {
  test("opens prefilled; a Member may not edit a teammate's task", () => {
    const v = getTaskEdit('pm', 17);
    expect(v).toMatchObject({
      allowed: true,
      meta: '#17 · Atlas Project · In review',
      reviewLocked: true,
    });
    expect(editForm('pm', 17)).toMatchObject({
      who: ['Dodi'],
      review: true,
      reviewer: 'Nico',
      tags: ['profile'],
    });
    expect(getTaskEdit('member', 12)).toEqual({
      allowed: false,
      title: "You can't edit this task",
      text: 'Only Nico, the project Manager or an Admin can edit #12.',
    });
    expect(getTaskEdit('pm', 99)).toBeNull();
  });

  test('saves every field; an unchanged reviewer keeps its name, a new one is named with its role tag', () => {
    const f = editForm('pm', 17);
    expect(
      saveTaskEdit('pm', 17, { ...f, title: ' Fixed title ', who: ['Dodi', 'Rina'], tags: ['ux'] }),
    ).toBe('Task updated');
    expect(getTask(17)).toMatchObject({
      title: 'Fixed title',
      who: 'Dodi',
      also: ['Rina'],
      tags: ['ux'],
    });
    expect(taskInfo(getTasksState(), 17).reviewer).toBe('Nico (creator, Manager)');
    saveTaskEdit('pm', 17, { ...editForm('pm', 17), reviewer: 'Ayu' });
    expect(taskInfo(getTasksState(), 17).reviewer).toBe('Ayu (Admin)');
  });

  test('turning review on gives the To do detail only Start working', () => {
    saveTaskEdit('pm', 14, { ...editForm('pm', 14), review: true, reviewer: '' });
    expect(taskInfo(getTasksState(), 14).reviewer).toBe('Ayu (Admin)');
    expect(getTaskDetail('pm', 14)?.actions.map((a) => a.key)).toEqual(['start']);
  });

  test('refuses an empty title or a role that may not edit', () => {
    expect(() => saveTaskEdit('pm', 14, { ...editForm('pm', 14), title: ' ' })).toThrow(
      'Cannot save task #14: title and assignee are required',
    );
    expect(() => saveTaskEdit('member', 12, editForm('pm', 12))).toThrow(
      'Cannot edit task #12: not allowed for member',
    );
  });
});

describe('New task · Fill form', () => {
  test('opens on Atlas from the first AI draft; a Member gets only their projects', () => {
    const f = getTaskForm('pm');
    expect(f.project.id).toBe('atlas');
    expect(f.initial).toMatchObject({
      title: 'Fix the login page',
      who: ['Rina'],
      due: '2026-10-08',
      priority: 'High',
      type: 'Bug',
      phase: 'Development',
      start: '2026-10-07',
      hours: '4',
      tags: ['login'],
    });
    expect(getTaskForm('member').projects.map((p) => p.id)).toEqual([
      'atlas',
      'migration',
      'tools',
    ]);
    expect(getTaskForm('admin').projects).toHaveLength(PROJECTS.length);
    expect(getTaskForm('pm', 'sinar').project.id).toBe('sinar');
  });

  test('switching project keeps only its members and drops the phase outside Atlas', () => {
    const f = { ...getTaskForm('pm').initial, who: ['Rina', 'Dodi'] };
    expect(pickProject(f, project('sinar'))).toMatchObject({ who: ['Rina'], phase: '' });
  });

  test('Save adds a To do task whose detail opens', () => {
    const f = getTaskForm('pm');
    const no = saveNewTask('pm', f.project, { ...f.initial, who: ['Rina', 'Dodi'] });
    expect(getTask(no)).toMatchObject({
      status: 'To do',
      who: 'Rina',
      also: ['Dodi'],
      project: 'Atlas Project',
    });
    expect(getTaskDetail('pm', no)?.meta).toBe(`#${no} · Atlas Project · Bug · Development`);
    expect(taskInfo(getTasksState(), no)).toMatchObject({
      start: '2026-10-07',
      hours: '4',
      reviewer: undefined,
    });
    expect(() => saveNewTask('member', project('sinar'), f.initial)).toThrow(
      'Cannot add a task to PT Sinar Client Portal: not allowed for member',
    );
  });
});

describe('Just write, CSV and project settings', () => {
  test('Just write shows the sample drafts, never an LLM', () => {
    const w = getQuickWrite();
    expect(w.drafts.map((d) => d.dueLabel)).toEqual(['Oct 8 (tomorrow)', 'Oct 9 (Friday)']);
    expect([w.askTitle, w.saveLabel]).toEqual(['Which Rina?', 'Save 2 tasks']);
  });

  test('CSV preview counts like the prototype', () => {
    const c = getCsvImport();
    expect(c.file).toBe('atlas-tasks.csv · 5 rows');
    expect(c.summary).toBe('4 ready (1 with a note) · 1 error');
    expect(c.importLabel).toBe('Import 4 tasks');
    expect(c.rows.map((r) => r.label)).toEqual([
      '✓ Ready',
      '✕ Error',
      'Note',
      '✓ Ready',
      '✓ Ready',
    ]);
    expect(c.rows[0].line).toBe('rina@kantor.id · Due Oct 15');
    expect(c.rows[4].line).toBe('(empty → no assignee) · (empty → Medium) · (empty → no due date)');
  });

  test('project settings for Managers and Admins only, with type and tag counts', () => {
    expect(getTaskSettings('member', 'atlas')).toEqual({ allowed: false });
    const s = getTaskSettings('pm', 'atlas');
    expect(s).toMatchObject({ allowed: true, project: 'Atlas Project', needsReview: false });
    if (!s.allowed) throw new Error('test-only');
    expect(s.types.map((t) => [t.name, t.category, t.count])).toEqual([
      ['Task', 'Task (task)', '4 tasks'],
      ['Bug', 'Issue (issue)', '2 tasks'],
      ['Improvement', 'Idea (idea)', '0 tasks'],
    ]);
    expect(s.tags).toEqual([
      { tag: 'sso', count: '1 task' },
      { tag: 'login', count: '1 task' },
      { tag: 'profile', count: '1 task' },
      { tag: 'api', count: '1 task' },
      { tag: 'design', count: '1 task' },
      { tag: 'testing', count: '1 task' },
    ]);
    expect(() => getTaskSettings('pm', 'nope')).toThrow(
      'Cannot open project settings: no project "nope"',
    );
  });
});
