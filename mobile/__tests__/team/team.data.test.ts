// The Team mapping: a server DTO turned into what the two screens draw. The privacy contract is an
// absent key, so most of these tests are about a key that is *not* there (server/team/team.dto.ts).
import { teamOf, type TeamData } from '../../src/data/team';
import type { TeamPersonWire, TeamSummaryWire } from '../../src/data/team.api';
import { personOf, taskRow } from '../../src/data/team.person';
import { personBody, teamMember } from '../helpers/team-trash-server';

const page = (
  people: Record<string, unknown>[],
  total = people.length,
  summary: Partial<TeamSummaryWire> = {},
) =>
  teamOf(
    {
      rows: people as unknown as TeamPersonWire[],
      total,
      extra: { people: total, projects: 1, ...summary },
    },
    'pm',
  ) as TeamData;

describe('team rows', () => {
  test('the role line is the job title and the projects, with the role in each', () => {
    const d = page([
      teamMember({
        projects: [
          { id: 'p-atlas', name: 'Atlas', role: 'manager' },
          { id: 'p-tools', name: 'Internal Tools', role: 'member' },
        ],
      }),
    ]);
    expect(d.people[0]?.role).toBe('UI Designer · Atlas (Manager), Internal Tools (Member)');
  });

  test('the key is the account id, so two people with one name do not share a row', () => {
    const d = page([
      teamMember({ id: 'u-1', name: 'Budi' }),
      teamMember({ id: 'u-2', name: 'Budi' }),
    ]);
    expect(d.people.map((p) => p.key)).toEqual(['u-1', 'u-2']);
  });

  test('availability null is not "Available": nothing is shown at all', () => {
    const d = page([teamMember({ availability: null })]);
    expect(d.people[0]?.status).toBe('');
  });

  test('a recorded leave is shown with the day it ends', () => {
    const d = page([teamMember({ availability: { kind: 'on_leave', until: '2026-10-14' } })]);
    expect(d.people[0]?.status).toBe('On leave until Oct 14');
  });

  test('an absent load hides the counts; a zero load does not', () => {
    const hidden = page([teamMember()]);
    expect(hidden.people[0]?.load).toBeUndefined();
    const zero = page([teamMember({ load: { active: 0, overdue: 0 } })]);
    expect(zero.people[0]?.load).toEqual({ active: 0, overdue: 0 });
  });

  test('alsoElsewhere becomes a line without a number, because the viewer may not know it', () => {
    const d = page([teamMember({ load: { active: 2, overdue: 0, alsoElsewhere: true } })]);
    expect(d.people[0]?.extra).toBe('Also has open tasks on projects you do not share');
    expect(d.people[0]?.extra).not.toMatch(/\d/);
  });

  test('isSelf marks the row, and nothing else does', () => {
    const d = page([teamMember({ isSelf: true }), teamMember({ id: 'u-x' })]);
    expect(d.people.map((p) => p.you)).toEqual([true, false]);
  });
});

describe('the summary line', () => {
  test('people and projects describe the whole team', () => {
    const d = page([teamMember()], 12, { people: 12, projects: 3 });
    expect(d.summary).toBe('12 people · 3 projects');
  });

  test('the load totals are shown when the page is the whole team', () => {
    const d = page([teamMember()], 1, { people: 1, projects: 1, active: 4, overdue: 1 });
    expect(d.summary).toBe('1 people · 1 projects · 4 active tasks · 1 overdue');
  });

  test('…and left out while rows are missing: they would only cover one page', () => {
    const d = page([teamMember()], 40, { people: 40, projects: 2, active: 4, overdue: 1 });
    expect(d.summary).toBe('40 people · 2 projects');
    expect(d.hasMore).toBe(true);
  });

  test('the note follows the role, and no role means no note', () => {
    const rows = [teamMember()] as unknown as TeamPersonWire[];
    const extra = { people: 1, projects: 1 };
    expect(teamOf({ rows, total: 1, extra }, 'admin')?.note).toMatch(/More › Users/);
    expect(teamOf({ rows, total: 1, extra }, 'member')?.note).toMatch(/visible only to/);
    expect(teamOf({ rows, total: 1, extra }, 'pm')?.note).toBeUndefined();
    expect(teamOf({ rows, total: 1, extra }, null)?.note).toBeUndefined();
  });

  test('nothing loaded is null, which is how a screen knows to wait', () => {
    expect(teamOf(null, 'pm')).toBeNull();
  });
});

describe('one person', () => {
  test('facts leave out what the server did not send', () => {
    const d = personOf(personBody({ person: { id: 'u-rina', name: 'Rina', jobTitle: null, department: null, email: 'rina@kantor.id' } }) as never, 'pm');
    expect(d?.facts).toEqual([['Email', 'rina@kantor.id']]);
  });

  test('an absent accountRole hides the row; an Admin gets it, labelled', () => {
    expect(personOf(personBody() as never, 'pm')?.facts.map(([l]) => l)).not.toContain(
      'Account role',
    );
    const admin = personOf(personBody({ accountRole: 'project_manager' }) as never, 'admin');
    expect(admin?.facts).toContainEqual(['Account role', 'Project Manager']);
  });

  test('a phone reaches only those the server sends it to', () => {
    const d = personOf(
      personBody({ person: { ...personBody().person, phone: '+62 812 0000' } }) as never,
      'admin',
    );
    expect(d?.facts).toContainEqual(['Phone', '+62 812 0000']);
  });

  test('tasksVisible false is not "no tasks": tasks is null', () => {
    expect(personOf(personBody({ tasksVisible: false, tasks: undefined }) as never, 'member')?.tasks).toBeNull();
    expect(personOf(personBody({ tasks: [] }) as never, 'pm')?.tasks).toEqual({
      load: undefined,
      rows: [],
      capped: false,
    });
  });

  test('alsoElsewhere names no project, because the server deliberately sends none', () => {
    const d = personOf(personBody({ alsoElsewhere: true }) as never, 'pm');
    expect(d?.elsewhere).toContain('projects you do not share');
    expect(d?.elsewhere).not.toContain('Atlas');
  });

  test('the projects heading follows the role', () => {
    expect(personOf(personBody() as never, 'admin')?.projectsTitle).toBe('Projects');
    expect(personOf(personBody() as never, 'member')?.projectsTitle).toBe('Shared projects');
  });
});

describe('a task row of one person', () => {
  const projects = [{ id: 'p-atlas', name: 'Atlas', role: 'member' as const }];

  test('the project name comes from the projects beside it, matched on id', () => {
    const row = taskRow(
      { number: 15, title: 'Review the design', status: 'todo', dueDate: '2026-10-09', projectId: 'p-atlas' },
      projects,
    );
    expect(row.title).toBe('#15 Review the design');
    expect(row.sub).toBe('Atlas · Due Oct 9');
    expect(row.pill).toBe('To do');
  });

  test('a project the viewer cannot see leaves the name out rather than inventing one', () => {
    const row = taskRow(
      { number: 7, title: 'Secret', status: 'in_progress', dueDate: null, projectId: 'p-other' },
      projects,
    );
    expect(row.sub).toBe('');
    expect(row.pill).toBe('In progress');
  });

  test('"Overdue" is decided against the server\'s today, not the phone\'s', () => {
    // The seeded clock is 2026-10-07 in Asia/Jakarta (helpers/session-fixtures.ts).
    const late = taskRow(
      { number: 9, title: 'Late', status: 'todo', dueDate: '2026-10-06', projectId: 'p-atlas' },
      projects,
    );
    const dueToday = taskRow(
      { number: 10, title: 'Today', status: 'todo', dueDate: '2026-10-07', projectId: 'p-atlas' },
      projects,
    );
    expect(late.pill).toBe('Overdue');
    expect(dueToday.pill).toBe('To do');
  });
});
