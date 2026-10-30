/** Local editing of a story draft before saving (plan §4.8): rename/remove phases and tasks, then convert to the create body. */
import { describe, expect, it } from 'bun:test';
import {
  editableDraftOf,
  removePhase,
  removeTask,
  renamePhase,
  renameTask,
  toCreateProjectInput,
} from '../app/components/projects/create/project-draft.flow';
import type { ProjectDraft } from '../server/ai/project-draft.types';

const draft: ProjectDraft = {
  name: 'Renovasi Dapur',
  description: 'Dari cerita',
  startDate: '2030-01-01',
  dueDate: '2030-02-01',
  priority: 'high',
  phases: [
    {
      name: 'Persiapan',
      description: null,
      startDate: '2030-01-01',
      endDate: '2030-01-07',
      tasks: [
        {
          title: 'Beli cat',
          description: null,
          priority: null,
          kindName: null,
          dueDate: '2030-01-03',
        },
      ],
    },
  ],
  looseTasks: [
    { title: 'Rapat kickoff', description: null, priority: null, kindName: null, dueDate: null },
  ],
};

describe('editableDraftOf and the create body it produces', () => {
  it('keeps every phase and task, each with a unique key', () => {
    const d = editableDraftOf(draft);
    expect(d.phases).toHaveLength(1);
    expect(d.phases[0]?.tasks).toHaveLength(1);
    expect(d.looseTasks).toHaveLength(1);
    const keys = [d.phases[0]?.key, d.phases[0]?.tasks[0]?.key, d.looseTasks[0]?.key];
    expect(new Set(keys).size).toBe(3);
  });

  it('round-trips into a POST /api/app/projects body with the same phases and tasks', () => {
    const body = toCreateProjectInput(editableDraftOf(draft));
    expect(body).toMatchObject({
      name: 'Renovasi Dapur',
      description: 'Dari cerita',
      priority: 'high',
      startDate: '2030-01-01',
      dueDate: '2030-02-01',
    });
    expect(body.phases).toEqual([
      {
        name: 'Persiapan',
        description: null,
        startDate: '2030-01-01',
        endDate: '2030-01-07',
        tasks: [
          {
            title: 'Beli cat',
            description: null,
            priority: undefined,
            kindName: null,
            dueDate: '2030-01-03',
          },
        ],
      },
    ]);
    expect(body.looseTasks).toEqual([
      {
        title: 'Rapat kickoff',
        description: null,
        priority: undefined,
        kindName: null,
        dueDate: null,
      },
    ]);
  });
});

describe('removePhase / removeTask / renamePhase / renameTask', () => {
  it('removePhase drops the phase and its tasks, leaving loose tasks untouched', () => {
    const d = editableDraftOf(draft);
    const after = removePhase(d, d.phases[0]?.key as string);
    expect(after.phases).toEqual([]);
    expect(after.looseTasks).toHaveLength(1);
  });

  it('removeTask finds a task whether it is inside a phase or loose', () => {
    const d = editableDraftOf(draft);
    const afterPhaseTask = removeTask(d, d.phases[0]?.tasks[0]?.key as string);
    expect(afterPhaseTask.phases[0]?.tasks).toEqual([]);
    const afterLoose = removeTask(d, d.looseTasks[0]?.key as string);
    expect(afterLoose.looseTasks).toEqual([]);
  });

  it('renamePhase and renameTask change only the targeted item', () => {
    const d = editableDraftOf(draft);
    const renamed = renamePhase(d, d.phases[0]?.key as string, 'Tahap baru');
    expect(renamed.phases[0]?.name).toBe('Tahap baru');
    const renamedTask = renameTask(d, d.looseTasks[0]?.key as string, 'Judul baru');
    expect(renamedTask.looseTasks[0]?.title).toBe('Judul baru');
    expect(renamedTask.phases[0]?.tasks[0]?.title).toBe('Beli cat'); // untouched
  });
});
