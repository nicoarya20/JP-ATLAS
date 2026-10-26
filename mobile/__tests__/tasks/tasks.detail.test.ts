import { findEntry, resetArchive } from '../../src/data/archive.store';
import { getTaskDetail } from '../../src/data/tasks';
import {
  archiveFromDetail,
  cancelReason,
  cancelTask,
  nextReturnCount,
  returnTask,
  runTaskAction,
  undoArchive,
} from '../../src/data/tasks.actions';
import type { TaskDetailView } from '../../src/data/tasks.detail';
import { getTasksState } from '../../src/data/tasks.state';
import { getTask, resetTasks, taskInfo } from '../../src/data/tasks.store';

const detail = (role: 'member' | 'pm' | 'admin', no: number): TaskDetailView => {
  const d = getTaskDetail(role, no);
  if (!d) throw new Error(`test-only: no task #${no}`);
  return d;
};
const keys = (d: TaskDetailView) => d.actions.map((a) => a.key);
const fact = (d: TaskDetailView, key: string) => d.facts.find((f) => f.key === key);
const lastLog = (no: number) => taskInfo(getTasksState(), no).history.at(-1)?.text;

afterEach(() => {
  resetTasks();
  resetArchive();
});

describe('detail per variant', () => {
  test('To do: Start working and Mark done, steps empty, review off', () => {
    const d = detail('pm', 14);
    expect(d.variant).toBe('todo');
    expect(d.meta).toBe('#14 · Atlas Project · Task · Development');
    expect(d.due).toBe('Today');
    expect(keys(d)).toEqual(['start', 'markDone']);
    expect(d.actions[0]).toEqual({ key: 'start', label: 'Start working', primary: true });
    expect(d.menu).toEqual(['edit', 'cancel', 'archive']);
    expect(fact(d, 'review')).toMatchObject({ value: 'Off · Mark done directly' });
    expect(fact(d, 'createdBy')).toMatchObject({ value: 'Nico · Oct 5' });
    expect(d.steps).toEqual({ title: 'Steps', items: [], empty: 'No steps yet.', addStep: true });
    expect(detail('member', 16).facts.find((f) => f.key === 'review')).toBeUndefined();
  });

  test('In progress with a reviewer: Request review, the lead note, evidence and steps', () => {
    const d = detail('pm', 12);
    expect(keys(d)).toEqual(['requestReview']);
    expect(fact(d, 'review')).toMatchObject({ value: 'Yes · turned on by Rina' });
    expect(fact(d, 'reviewer')).toMatchObject({ value: 'Admin' });
    expect(fact(d, 'due')).toMatchObject({ value: 'Oct 5', note: '(2 days late)' });
    expect(d.leadNote).toMatch(/^The lead is the assignee/);
    expect(d.evidence).toMatchObject({ title: 'Evidence 1', attach: true });
    expect(d.steps?.title).toBe('Steps 2/3');
    expect(d.history[2]).toEqual({
      text: 'Dodi: "the error still shows on staging"',
      when: 'Oct 6',
      who: 'Dodi',
    });
  });

  test('In review: Approve and Return for a Manager, a waiting note for its Member', () => {
    const pm = detail('pm', 17);
    expect(keys(pm)).toEqual(['approve']);
    expect(pm.canReturn).toBe(true);
    expect(pm.approveHint).toBe('Approve → automatically Done');
    expect(pm.banner).toEqual({
      title: 'Dodi asked you to review this task',
      sub: 'Requested Oct 7',
    });
    expect(pm.evidence?.title).toBe('Evidence from Dodi 2');
    expect(pm.steps?.title).toBe('Steps 2/2 ✓');
    const member = detail('member', 17);
    expect(keys(member)).toEqual([]);
    expect(member.canReturn).toBe(false);
    expect(member.stateNote?.kind).toBe('waiting');
    expect(member.banner?.title).toBe('You asked Nico to review this task');
    expect(member.evidence?.title).toBe('Your evidence 2');
    expect(detail('admin', 17).banner?.title).toBe('Dodi asked Nico to review this task');
  });

  test("a Member sees who may change a teammate's task, without a menu", () => {
    const d = detail('member', 12);
    expect(d.stateNote).toEqual({
      kind: 'notYours',
      text: 'Only Nico, the project Manager or an Admin can change this task.',
    });
    expect(d.actions).toEqual([]);
    expect(d.menu).toEqual([]);
  });

  test('a Member gets Edit and Cancel but not Move to Archive on their own task they did not create', () => {
    expect(detail('member', 17).menu).toEqual(['edit', 'cancel']);
  });

  test('unknown task', () => {
    expect(getTaskDetail('pm', 99)).toBeNull();
  });
});

describe('detail actions', () => {
  test('Start working, then Mark done, then Reopen, each logged as the viewer', () => {
    expect(runTaskAction('pm', 14, 'start')).toBe('Task started');
    expect(getTask(14)?.status).toBe('In progress');
    expect(lastLog(14)).toBe('Nico started working');
    expect(runTaskAction('pm', 14, 'markDone')).toBe('Marked as done');
    expect(keys(detail('pm', 14))).toEqual(['reopen']);
    expect(runTaskAction('pm', 14, 'reopen')).toBe('Task reopened');
    expect(getTask(14)?.status).toBe('In progress');
  });

  test("Request review asks the task's own reviewer and shows the banner", () => {
    expect(runTaskAction('pm', 12, 'requestReview')).toBe('Review requested');
    expect(lastLog(12)).toBe('Nico requested review · reviewer: Admin');
    // As in the prototype, a reviewer named "Admin" is not matched to the viewer in the banner.
    expect(detail('admin', 12).banner?.title).toBe('Nico asked Admin to review this task');
  });

  test('Approve finishes a reviewed task; actions not offered are refused', () => {
    expect(runTaskAction('admin', 17, 'approve')).toBe('Task approved');
    expect(getTask(17)?.status).toBe('Done');
    expect(() => runTaskAction('member', 12, 'start')).toThrow(
      'Cannot start task #12: not offered to member',
    );
    expect(() => runTaskAction('pm', 12, 'markDone')).toThrow('not offered to pm');
  });

  test('Return needs a reason and counts the returns', () => {
    expect(nextReturnCount(17)).toBe(1);
    expect(() => returnTask('pm', 17, '   ')).toThrow(
      'Cannot return task #17: a reason is required',
    );
    expect(() => returnTask('member', 17, 'x')).toThrow('not offered to member');
    expect(returnTask('pm', 17, 'Still has errors')).toBe('Task returned');
    expect(getTask(17)?.status).toBe('In progress');
    expect(lastLog(17)).toBe('Nico returned this task ×1: Still has errors');
    expect(nextReturnCount(17)).toBe(2);
  });

  test('Cancel keeps the task listed as Canceled with why, then Restore brings it back to To do', () => {
    expect(cancelReason(-1, '')).toBeNull();
    expect(cancelReason(4, '  ')).toBeNull();
    expect(cancelReason(4, 'Merged')).toBe('Merged');
    expect(cancelReason(1, 'scope cut')).toBe('No longer needed (scope cut)');
    expect(cancelTask('pm', 15, 0, '')).toBe('Task canceled');
    const d = detail('pm', 15);
    expect(d.stateNote).toEqual({
      kind: 'canceled',
      text: 'Canceled by Nico: Duplicate / already exists',
      restore: true,
    });
    expect(d.menu).toEqual(['archive']);
    expect(runTaskAction('pm', 15, 'restore')).toBe('Task restored');
    expect(getTask(15)?.status).toBe('To do');
    expect(taskInfo(getTasksState(), 15).canceled).toBeUndefined();
  });

  test('Move to Archive with Undo; an archived task shows only its note', () => {
    expect(archiveFromDetail('pm', 14)).toBe('Task moved to Archive');
    const d = detail('pm', 14);
    expect(d.stateNote).toEqual({ kind: 'archived', text: 'This task is in Archive.' });
    expect(d.menu).toEqual([]);
    expect(undoArchive(14)).toBe('Task restored');
    expect(findEntry('task-14')).toBeUndefined();
    expect(() => archiveFromDetail('member', 17)).toThrow(
      'Cannot archive task #17: not offered to member',
    );
  });
});
