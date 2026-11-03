/** `buildTemplateSnapshot`: a project's phases and tasks as template input (offsets, caps, what is left out). */
import { describe, expect, it } from 'bun:test';
import { addDays } from '../server/ai/task-draft.dates';
import {
  buildTemplateSnapshot,
  type SnapshotPhase,
  type SnapshotTask,
} from '../server/project/project-template.snapshot';

const LIMITS = { maxPhases: 6, maxTasks: 20 };

const phase = (id: string, over: Partial<SnapshotPhase> = {}): SnapshotPhase => ({
  id,
  name: `Fase ${id}`,
  description: null,
  startDate: null,
  endDate: null,
  ...over,
});
const task = (title: string, over: Partial<SnapshotTask> = {}): SnapshotTask => ({
  title,
  description: null,
  priority: 'medium',
  kindName: null,
  dueDate: null,
  phaseId: null,
  ...over,
});

describe('offsets', () => {
  it('measures every date from the project start', () => {
    const snap = buildTemplateSnapshot(
      {
        projectStart: '2030-03-01',
        phases: [phase('a', { startDate: '2030-03-01', endDate: '2030-03-08' })],
        tasks: [task('Beli material', { phaseId: 'a', dueDate: '2030-03-04' })],
      },
      LIMITS,
    );
    expect(snap.phases[0]).toMatchObject({ startOffsetDays: 0, endOffsetDays: 7 });
    expect(snap.phases[0]?.tasks?.[0]).toMatchObject({ title: 'Beli material', dueOffsetDays: 3 });
  });

  it('uses the earliest date as day 0 when the project has no start, so no offset is negative', () => {
    const snap = buildTemplateSnapshot(
      {
        projectStart: null,
        phases: [phase('a', { startDate: '2030-03-10' })],
        tasks: [task('Lebih awal', { dueDate: '2030-03-05' })],
      },
      LIMITS,
    );
    expect(snap.looseTasks[0]?.dueOffsetDays).toBe(0);
    expect(snap.phases[0]?.startOffsetDays).toBe(5);
  });

  it('pulls day 0 back to a date earlier than the project start instead of going negative', () => {
    const snap = buildTemplateSnapshot(
      {
        projectStart: '2030-03-10',
        phases: [],
        tasks: [task('Sebelum mulai', { dueDate: '2030-03-08' })],
      },
      LIMITS,
    );
    expect(snap.looseTasks[0]?.dueOffsetDays).toBe(0);
  });

  it('leaves offsets null when the project has no dates at all', () => {
    const snap = buildTemplateSnapshot(
      { projectStart: null, phases: [phase('a')], tasks: [task('Tanpa tanggal')] },
      LIMITS,
    );
    expect(snap.phases[0]).toMatchObject({ startOffsetDays: null, endOffsetDays: null });
    expect(snap.looseTasks[0]?.dueOffsetDays).toBeNull();
  });

  it('round-trips: using the template at the same start date gives back the original dates', () => {
    const start = '2030-02-20'; // crosses a month end on purpose
    const snap = buildTemplateSnapshot(
      {
        projectStart: start,
        phases: [phase('a', { startDate: '2030-02-20', endDate: '2030-03-03' })],
        tasks: [task('T', { phaseId: 'a', dueDate: '2030-03-01' })],
      },
      LIMITS,
    );
    const p = snap.phases[0];
    expect(addDays(start, p?.startOffsetDays ?? 0)).toBe('2030-02-20');
    expect(addDays(start, p?.endOffsetDays ?? 0)).toBe('2030-03-03');
    expect(addDays(start, p?.tasks?.[0]?.dueOffsetDays ?? 0)).toBe('2030-03-01');
  });
});

describe('structure', () => {
  it('keeps the phase order, groups tasks under their phase and keeps loose ones apart', () => {
    const snap = buildTemplateSnapshot(
      {
        projectStart: null,
        phases: [phase('a'), phase('b')],
        tasks: [
          task('b1', { phaseId: 'b' }),
          task('loose'),
          task('a1', { phaseId: 'a' }),
          task('a2', { phaseId: 'a', kindName: 'Bug', priority: 'high' }),
        ],
      },
      LIMITS,
    );
    expect(snap.phases.map((p) => p.name)).toEqual(['Fase a', 'Fase b']);
    expect(snap.phases[0]?.tasks?.map((t) => t.title)).toEqual(['a1', 'a2']);
    expect(snap.phases[0]?.tasks?.[1]).toMatchObject({ kindName: 'Bug', priority: 'high' });
    expect(snap.phases[1]?.tasks?.map((t) => t.title)).toEqual(['b1']);
    expect(snap.looseTasks.map((t) => t.title)).toEqual(['loose']);
    expect(snap.omitted).toEqual({ phases: 0, tasks: 0 });
  });
});

describe('size cap', () => {
  it('keeps the first phases and reports the rest, dropping their tasks instead of making them loose', () => {
    const phases = ['a', 'b', 'c'].map((id) => phase(id));
    const tasks = [task('a1', { phaseId: 'a' }), task('c1', { phaseId: 'c' }), task('loose')];
    const snap = buildTemplateSnapshot(
      { projectStart: null, phases, tasks },
      { maxPhases: 2, maxTasks: 20 },
    );
    expect(snap.phases.map((p) => p.name)).toEqual(['Fase a', 'Fase b']);
    expect(snap.looseTasks.map((t) => t.title)).toEqual(['loose']);
    expect(snap.omitted).toEqual({ phases: 1, tasks: 1 });
  });

  it('keeps the first tasks in template order and counts the rest as omitted', () => {
    const tasks = [
      task('loose-1'),
      task('a1', { phaseId: 'a' }),
      task('a2', { phaseId: 'a' }),
      task('loose-2'),
    ];
    const snap = buildTemplateSnapshot(
      { projectStart: null, phases: [phase('a')], tasks },
      { maxPhases: 6, maxTasks: 3 },
    );
    expect(snap.phases[0]?.tasks?.map((t) => t.title)).toEqual(['a1', 'a2']);
    expect(snap.looseTasks.map((t) => t.title)).toEqual(['loose-1']);
    expect(snap.omitted.tasks).toBe(1);
  });
});
