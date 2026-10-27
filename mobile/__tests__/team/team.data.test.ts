import { PROJECTS } from '../../src/data/sample';
import { getTasksState } from '../../src/data/tasks.state';
import { moveTask, resetTasks } from '../../src/data/tasks.store';
import { getTeam } from '../../src/data/team';
import { isOverdue, loadOf, totalOf } from '../../src/data/team.load';
import { getTeamPerson } from '../../src/data/team.person';

afterEach(resetTasks);

describe('team.load', () => {
  test('counts open tasks per person and the overdue ones', () => {
    expect(loadOf('Nico')).toEqual({ active: 3, overdue: 1 });
    expect(loadOf('Rina')).toEqual({ active: 1, overdue: 0 });
    expect(totalOf(['Nico', 'Rina', 'Dodi'])).toBe('6 active tasks · 1 overdue');
  });

  test('a task moved to Done leaves the load', () => {
    const [t] = getTasksState().tasks.filter((x) => x.who === 'Rina' && x.status !== 'Done');
    moveTask(t.no, 'Done');
    expect(loadOf('Rina')).toEqual({ active: 0, overdue: 0 });
  });

  test('no due date is never overdue', () => {
    expect(isOverdue({ due: '' })).toBe(false);
  });
});

describe('getTeam', () => {
  test('PM: the people of my projects, me first, with counts', () => {
    const d = getTeam('pm');
    if (d.empty) throw new Error('expected people');
    expect(d.summary).toBe('Projects you manage · 3 people · 6 active tasks · 1 overdue');
    expect(d.people.map((p) => [p.key, p.you])).toEqual([
      ['nico', true],
      ['rina', false],
      ['dodi', false],
    ]);
    expect(d.people.every((p) => p.load)).toBe(true);
  });

  test('Admin: everyone, with the Users note; no counts for people off projects', () => {
    const d = getTeam('admin');
    if (d.empty) throw new Error('expected people');
    expect(d.summary).toBe('All projects · 6 people · 6 active tasks · 1 overdue');
    expect(d.people[0]).toMatchObject({ key: 'ayu', you: true, load: undefined });
    expect(d.note).toBe('Approving new users and changing roles happens in More › Users.');
  });

  test('Member: only my own counts; on no project, the empty state', () => {
    const d = getTeam('member');
    if (d.empty) throw new Error('expected people');
    expect(d.people.filter((p) => p.load).map((p) => p.key)).toEqual(['dodi']);
    const none = PROJECTS.map((p) => ({ ...p, members: p.members.filter((m) => m !== 'Dodi') }));
    expect(getTeam('member', { projects: none })).toEqual({ empty: true });
  });
});

describe('getTeamPerson', () => {
  test('a PM sees the shared projects and the tasks, with the projects not shared', () => {
    const d = getTeamPerson('pm', 'rina');
    expect(d?.projectsTitle).toBe('Shared projects');
    expect(d?.tasks?.rows.map((r) => r.title)).toEqual(['#15 Review the onboarding page design']);
    expect(d?.tasks?.hidden).toEqual(['Company Profile Website']);
  });

  test('a Member does not see someone else’s tasks; an unknown key is nobody', () => {
    expect(getTeamPerson('member', 'rina')?.tasks).toBeNull();
    expect(getTeamPerson('member', 'dodi')?.tasks).not.toBeNull();
    expect(getTeamPerson('pm', 'nobody')).toBeNull();
  });
});
