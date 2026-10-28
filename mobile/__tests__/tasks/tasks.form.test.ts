// The values of New task · Fill form and Edit task on the server's terms (tasks.form.ts): the choices a project offers,
// a blank form and a project switch, what keeps Save off, the POST body and the PATCH changes; then the sample-backed
// Just write ✦, CSV preview and project settings, still Phase 1.
import { resetArchive } from '../../src/data/archive.store';
import type { ProjectMemberWire } from '../../src/data/projects.wire';
import {
  assigneeOptions,
  createBody,
  defaultKind,
  editChanges,
  editFormOf,
  formProblem,
  kindOptions,
  newTaskForm,
  phaseOptions,
  pickFormProject,
} from '../../src/data/tasks.form';
import { getTaskSettings } from '../../src/data/tasks.settings';
import { resetTasks } from '../../src/data/tasks.store';
import { getCsvImport, getQuickWrite } from '../../src/data/tasks.write';
import { detailOf, row } from '../helpers/tasks-fixtures';
import { FORM_PROJECTS, MEMBERS } from '../helpers/tasks-form-fixtures';

const [ATLAS_FORM, SINAR_FORM] = FORM_PROJECTS;
const TODAY = '2026-10-07';
const values = (o: { value: string }[] | null) => o?.map((x) => x.value) ?? null;

afterEach(() => {
  resetTasks();
  resetArchive();
});

describe('form choices', () => {
  test('the default kind is the first of base kind "task", else the first kind', () => {
    expect(defaultKind(ATLAS_FORM)).toBe('k-task');
    const noTask = { ...ATLAS_FORM, kinds: ATLAS_FORM.kinds.filter((k) => k.baseKind !== 'task') };
    expect(defaultKind(noTask)).toBe('k-bug');
    expect(defaultKind({ ...ATLAS_FORM, kinds: [] })).toBe('');
  });

  test('a retired kind of the edited task stays a choice, first', () => {
    expect(values(kindOptions(ATLAS_FORM))).toEqual(['k-task', 'k-bug', 'k-idea']);
    expect(kindOptions(ATLAS_FORM, { id: 'k-old', name: 'Chore' })[0]).toEqual({
      value: 'k-old',
      label: 'Chore',
    });
    expect(kindOptions(ATLAS_FORM, { id: 'k-bug', name: 'Bug' })).toHaveLength(3);
  });

  test('"No phase" leads the phases; a project without phases has no Phase field', () => {
    expect(phaseOptions(ATLAS_FORM, 'No phase')).toEqual([
      { value: '', label: 'No phase' },
      { value: 'ph-design', label: 'Design' },
      { value: 'ph-dev', label: 'Development' },
    ]);
    expect(phaseOptions(SINAR_FORM, 'No phase')).toBeNull();
  });

  test('assignees are the Managers and Members after "Unassigned"; a Viewer is not one', () => {
    const atlas = MEMBERS['p-atlas'];
    expect(assigneeOptions(atlas, 'Unassigned')).toEqual([
      { value: '', label: 'Unassigned' },
      { value: 'u-nico', label: 'Nico Arya' },
      { value: 'u-dodi', label: 'Dodi Hartono' },
    ]);
    // An edited task keeps its assignee as a choice even when they only watch now.
    expect(
      values(assigneeOptions(atlas, 'Unassigned', { id: 'u-rina', name: 'Rina Wulandari' })),
    ).toEqual(['', 'u-rina', 'u-nico', 'u-dodi']);
    expect(values(assigneeOptions(atlas, 'Unassigned', { id: 'u-dodi', name: 'Dodi' }))).toEqual([
      '',
      'u-nico',
      'u-dodi',
    ]);
    expect(assigneeOptions([] as ProjectMemberWire[], 'Unassigned')).toHaveLength(1);
  });
});

describe('New task', () => {
  test('a blank form starts today, Medium, with the default kind and nobody assigned', () => {
    expect(newTaskForm(ATLAS_FORM, TODAY)).toEqual({
      title: '',
      assigneeId: null,
      priority: 'medium',
      dueDate: null,
      startDate: TODAY,
      kindId: 'k-task',
      phaseId: null,
      description: '',
    });
  });

  test('another project drops the assignee and phase, and a kind it does not have', () => {
    const f = {
      ...newTaskForm(ATLAS_FORM, TODAY),
      assigneeId: 'u-dodi',
      phaseId: 'ph-dev',
      title: 'x',
    };
    expect(pickFormProject(f, SINAR_FORM)).toMatchObject({
      title: 'x',
      assigneeId: null,
      phaseId: null,
      kindId: 'k-sinar-task',
    });
    const shared = { ...ATLAS_FORM, id: 'p-copy' };
    expect(pickFormProject({ ...f, kindId: 'k-idea' }, shared).kindId).toBe('k-idea');
  });

  test('Save needs a title and a start no later than the due date', () => {
    expect(formProblem({ title: '  ', startDate: null, dueDate: null })).toBe('title');
    expect(formProblem({ title: 'x', startDate: '2026-10-08', dueDate: '2026-10-07' })).toBe(
      'dates',
    );
    expect(formProblem({ title: 'x', startDate: '2026-10-07', dueDate: '2026-10-07' })).toBeNull();
    expect(formProblem({ title: 'x', startDate: '2026-10-08', dueDate: null })).toBeNull();
  });

  test('the POST body is trimmed and leaves out what is unset', () => {
    const f = { ...newTaskForm(ATLAS_FORM, TODAY), title: ' Fix it ', description: '   ' };
    expect(createBody('p-atlas', f)).toEqual({
      projectId: 'p-atlas',
      title: 'Fix it',
      priority: 'medium',
      startDate: TODAY,
      kindId: 'k-task',
    });
    const full = {
      ...f,
      assigneeId: 'u-dodi',
      dueDate: '2026-10-14',
      phaseId: 'ph-dev',
      description: ' Safari ',
      priority: 'critical' as const,
    };
    expect(createBody('p-atlas', full)).toMatchObject({
      assigneeId: 'u-dodi',
      dueDate: '2026-10-14',
      phaseId: 'ph-dev',
      description: 'Safari',
      priority: 'critical',
    });
  });
});

describe('Edit task', () => {
  const task = detailOf(row(14, { dueDate: '2026-10-09' }), {
    description: 'Draft it',
    startDate: '2026-10-02',
  });

  test('opens on the task as the server sent it', () => {
    expect(editFormOf(task)).toEqual({
      title: 'Task 14',
      assigneeId: 'u-nico',
      priority: 'medium',
      dueDate: '2026-10-09',
      startDate: '2026-10-02',
      kindId: 'k-bug',
      phaseId: 'ph-dev',
      description: 'Draft it',
    });
    expect(editFormOf({ ...task, assignee: null, phase: null, description: null })).toMatchObject({
      assigneeId: null,
      phaseId: null,
      description: '',
    });
  });

  test('sends only what changed; nothing changed is null', () => {
    const before = editFormOf(task);
    expect(editChanges(before, before)).toBeNull();
    expect(
      editChanges(before, { ...before, title: ' Task 14 ', description: 'Draft it ' }),
    ).toBeNull();
    expect(
      editChanges(before, {
        ...before,
        title: 'Task 14 v2',
        assigneeId: null,
        phaseId: null,
        dueDate: '2026-10-12',
        kindId: 'k-task',
      }),
    ).toEqual({
      title: 'Task 14 v2',
      assigneeId: null,
      phaseId: null,
      dueDate: '2026-10-12',
      kindId: 'k-task',
    });
  });

  test('an emptied description is cleared; an empty kind is never sent', () => {
    const before = editFormOf(task);
    expect(editChanges(before, { ...before, description: '  ' })).toEqual({ description: null });
    expect(editChanges(before, { ...before, kindId: '' })).toBeNull();
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
