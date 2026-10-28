// Team answers as `GET /api/app/team` and `/team/:userId` send them (`server/team/team.dto.ts`). Optional keys are
// left out exactly as the server leaves them out for a viewer who may not see them. test-only
import type { TeamListWire, TeamPersonDetailWire, TeamPersonWire } from '@/data/team.api';

export const rina = (over: Partial<TeamPersonWire> = {}): TeamPersonWire => ({
  id: 'u-rina',
  name: 'Rina Wulandari',
  jobTitle: 'Designer',
  image: null,
  isSelf: false,
  projects: [{ id: 'p-atlas', name: 'Atlas Project', role: 'member' }],
  load: { active: 3, overdue: 1 },
  availability: null,
  ...over,
});

export const me = (over: Partial<TeamPersonWire> = {}): TeamPersonWire =>
  rina({
    id: 'u-nico',
    name: 'Nico Pratama',
    jobTitle: 'Project Manager',
    isSelf: true,
    projects: [{ id: 'p-atlas', name: 'Atlas Project', role: 'manager' }],
    load: { active: 2, overdue: 0 },
    ...over,
  });

/** A list answer; `counts: false` drops `summary.active/overdue` as for a Member. */
export function list(
  people: TeamPersonWire[],
  { total = people.length, counts = true }: { total?: number; counts?: boolean } = {},
): TeamListWire {
  const active = people.reduce((n, p) => n + (p.load?.active ?? 0), 0);
  const overdue = people.reduce((n, p) => n + (p.load?.overdue ?? 0), 0);
  return {
    summary: counts
      ? { people: total, projects: 1, active, overdue }
      : { people: total, projects: 1 },
    people,
    total,
  };
}

/** Rina as a Project Manager sees her: tasks visible, no account role. */
export const rinaDetail = (over: Partial<TeamPersonDetailWire> = {}): TeamPersonDetailWire => ({
  person: {
    id: 'u-rina',
    name: 'Rina Wulandari',
    jobTitle: 'Designer',
    department: 'Product',
    email: 'rina@example.test',
  },
  projects: [{ id: 'p-atlas', name: 'Atlas Project', role: 'member' }],
  tasks: [
    {
      number: 14,
      title: 'Polish onboarding',
      status: 'in_progress',
      dueDate: '2026-10-05',
      projectId: 'p-atlas',
    },
    { number: 15, title: 'Icon set', status: 'todo', dueDate: null, projectId: 'p-atlas' },
  ],
  availability: null,
  tasksVisible: true,
  load: { active: 2, overdue: 1 },
  ...over,
});

export const query = (url: string) => Object.fromEntries(new URL(url).searchParams);
