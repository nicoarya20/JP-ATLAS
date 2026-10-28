import { findEntry, listEntries, resetArchive } from '../../src/data/archive.store';
import { getTasksState } from '../../src/data/tasks.state';
import {
  addTask,
  archiveTask,
  getTask,
  listArchivedTasks,
  moveTask,
  putTasksBack,
  renameProjectTasks,
  resetTasks,
  takeProjectTasks,
  taskInfo,
  unarchiveTask,
} from '../../src/data/tasks.store';

const listed = () => getTasksState().tasks.map((t) => t.no);
const lastLog = (no: number) => taskInfo(getTasksState(), no).history.at(-1);
const NEW = {
  title: 'Fix the login page',
  project: 'Atlas Project',
  who: 'Rina',
  due: '2026-10-08',
  priority: 'High' as const,
  type: 'Bug' as const,
  tags: ['login'],
};

afterEach(() => {
  resetTasks();
  resetArchive();
});

describe('moveTask', () => {
  test('writes the status, a Done note for today, the update time and the history line', () => {
    moveTask(14, 'Done', { log: 'Nico marked this task done' });
    expect(getTask(14)).toMatchObject({
      status: 'Done',
      when: 'Done Oct 7',
      updated: '2026-10-07T09:41',
    });
    expect(lastLog(14)).toEqual({ text: 'Nico marked this task done', on: '2026-10-07' });
  });

  test('back from Done, a sample task gets its own note again; one that started Done gets one from its due date', () => {
    moveTask(14, 'Done');
    moveTask(14, 'In progress');
    expect(getTask(14)?.when).toBe('Today');
    moveTask(8, 'In progress');
    expect(getTask(8)?.when).toBe('17 days overdue');
    moveTask(12, 'Canceled');
    expect(getTask(12)?.when).toBe('Canceled Oct 7');
  });

  test('the same status changes nothing; an unknown task is refused', () => {
    const before = getTasksState();
    moveTask(12, 'In progress', { log: 'x' });
    expect(getTasksState()).toBe(before);
    expect(() => moveTask(99, 'Done')).toThrow('Cannot move task #99: no such task');
  });
});

describe('Archive', () => {
  test('archiving takes the task out of every list into Archive, newest first; getTask still finds it', () => {
    archiveTask(14, 'Nico');
    expect(listed()).not.toContain(14);
    expect(listArchivedTasks().map((t) => t.no)).toEqual([14]);
    expect(listEntries()[0]).toMatchObject({
      key: 'task-14',
      kind: 'TASK',
      title: '#14 Write the API spec',
      where: 'Atlas Project',
      by: 'Nico',
      date: '2026-10-07',
      ref: 14,
    });
    expect(getTask(14)?.title).toBe('Write the API spec');
    expect(lastLog(14)?.text).toBe('Nico moved this task to Archive');
  });

  test('Undo puts it back where it was and out of Archive', () => {
    const before = listed();
    archiveTask(14, 'Nico');
    unarchiveTask(14);
    expect(listed()).toEqual(before);
    expect(findEntry('task-14')).toBeUndefined();
    expect(listArchivedTasks()).toEqual([]);
  });

  test('refuses tasks that are not listed / not archived', () => {
    expect(() => archiveTask(99, 'Nico')).toThrow('Cannot archive task #99: not in the task lists');
    expect(() => unarchiveTask(14)).toThrow('Cannot restore task #14: not in Archive');
  });
});

describe('project changes', () => {
  test('an archived project takes its tasks along and brings them back in place', () => {
    const before = listed();
    const taken = takeProjectTasks('PT Sinar Client Portal');
    expect(taken).toEqual([{ at: 6, no: 9 }]);
    expect(listed()).not.toContain(9);
    expect(getTask(9)).toBeDefined();
    putTasksBack(taken);
    expect(listed()).toEqual(before);
    expect(() => putTasksBack(taken)).toThrow(
      'Cannot put task #9 back: it is not out of the lists',
    );
  });

  test('a renamed project renames its tasks, listed and archived', () => {
    archiveTask(14, 'Nico');
    renameProjectTasks('Atlas Project', 'Atlas 2');
    expect(getTask(12)?.project).toBe('Atlas 2');
    expect(getTask(14)?.project).toBe('Atlas 2');
    expect(getTask(9)?.project).toBe('PT Sinar Client Portal');
  });
});

describe('addTask', () => {
  test('a task without extras gets its project lead as creator', () => {
    expect(taskInfo(getTasksState(), 9)).toEqual({
      desc: '',
      by: 'Rina',
      steps: [],
      proof: [],
      history: [{ text: 'Rina created this task', on: null }],
    });
  });

  test('add numbers after every known task (Archive lists #21) and creates a To do task', () => {
    const no = addTask(NEW, { desc: 'From the meeting "Atlas daily stand-up"' }, 'Nico');
    expect(no).toBe(22);
    expect(getTask(22)).toMatchObject({
      status: 'To do',
      next: 'Start',
      when: 'Tomorrow',
      who: 'Rina',
    });
    expect(taskInfo(getTasksState(), 22)).toMatchObject({
      by: 'Nico',
      on: '2026-10-07',
      history: [{ text: 'Nico created this task', on: '2026-10-07' }],
    });
    expect(addTask(NEW, { desc: '' }, 'Nico')).toBe(23);
  });

  test('add refuses a due date that is not ISO', () => {
    expect(() => addTask({ ...NEW, due: '' }, { desc: '' }, 'Nico')).toThrow(
      'Cannot add task "Fix the login page": due must be an ISO date, got ""',
    );
  });

  test('reset brings back the sample', () => {
    const before = getTasksState();
    addTask(NEW, { desc: '' }, 'Nico');
    moveTask(14, 'Done');
    resetTasks();
    expect(getTasksState()).toBe(before);
  });
});
