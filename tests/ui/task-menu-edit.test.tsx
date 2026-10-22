/** "Ubah tugas" in the ⋯ menu (S2-13): offered only when the server's can.update is true; no delete. */
import { describe, expect, it } from 'bun:test';
import { hasTaskMenu, menuItemsOf } from '../../app/components/tasks/TaskMenu';
import { editTaskValues } from '../../app/components/tasks/task-form-edit';
import type { TaskDetail } from '../../app/lib/tasks-api';

describe('TaskMenu items', () => {
  it('offers Ubah tugas first only when can.update is true', () => {
    expect(menuItemsOf({ number: 1, can: { update: true, cancel: true } })).toEqual([
      'edit',
      'cancel',
    ]);
    expect(menuItemsOf({ number: 1, can: { update: true } })).toEqual(['edit']);
  });

  it('hides it when can.update is missing or only a refusal code', () => {
    expect(menuItemsOf({ number: 1, can: { cancel: true } })).toEqual(['cancel']);
    expect(menuItemsOf({ number: 1, can: { update: 'IMPERSONATING', cancel: true } })).toEqual([
      'cancel',
    ]);
    expect(hasTaskMenu({ number: 1, can: { update: 'IMPERSONATING' } })).toBe(false);
    expect(hasTaskMenu({ number: 1, can: {} })).toBe(false);
  });
});

describe('editTaskValues', () => {
  it('fills the form from the task and keeps the project fixed, without initial steps', () => {
    const task = {
      title: 'Pasang keramik',
      project: { id: 'p-1', name: 'Dapur' },
      assignee: { id: 'u-1', name: 'Dodi' },
      priority: 'high',
      dueDate: '2026-10-20',
      startDate: null,
      description: null,
      kind: { id: 'k-1', name: 'Tugas', baseKind: 'task' },
      phase: null,
    } as unknown as TaskDetail;
    expect(editTaskValues(task)).toEqual({
      projectId: 'p-1',
      title: 'Pasang keramik',
      assigneeId: 'u-1',
      priority: 'high',
      dueDate: '2026-10-20',
      description: '',
      kindId: 'k-1',
      phaseId: null,
      startDate: null,
      steps: [],
    });
  });
});
