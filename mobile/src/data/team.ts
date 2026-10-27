// Team for the screens (prototype team.list.jsx VARIANTS): who is on my team, their task load from the live task list,
// and what each role may see of it; one person is team.person.ts. Phase 2 reads the API here.

import { listPeople, me, type PersonInfo, type PersonKey, person } from './people';
import { PROJECTS, type Project, type Role } from './sample';
import { TEAM_LIST, type TeamEntry } from './sample/team';
import type { TaskItem } from './tasks.shared';
import { getTasksState } from './tasks.state';
import { type Load, loadOf, totalOf } from './team.load';

/** The live lists a team screen reads; tests pass their own. */
export type TeamSource = { tasks?: readonly TaskItem[]; projects?: readonly Project[] };

export type TeamRow = {
  key: PersonKey;
  full: string;
  you: boolean;
  role: string;
  extra?: string;
  /** Hidden (undefined) where the viewer may not see someone's task counts. */
  load?: Load;
};

export type TeamData =
  | { empty: true }
  | { empty: false; summary: string; people: TeamRow[]; note?: string };

export type TeamTaskRow = { no: number; title: string; sub: string; pill: string };

export type TeamPersonData = {
  person: PersonInfo;
  /** "Projects" for Admin (all of them), else "Shared projects". */
  projectsTitle: string;
  projects: { id: string; name: string }[];
  /** null: a Member looking at someone else, who may not see their tasks. */
  tasks: { load: Load; rows: TeamTaskRow[]; hidden: string[] } | null;
};

type Variant = Partial<Omit<TeamEntry, 'key'>> & { key: PersonKey; you?: boolean; counts?: false };

const entry = (key: TeamEntry['key']) => {
  const found = TEAM_LIST.find((o) => o.key === key);
  if (!found) throw new Error(`Team sample has no row for ${key}`);
  return found;
};

const nameOf = (key: PersonKey) => person(key)?.name ?? key;

function row(v: Variant, tasks: readonly TaskItem[]): TeamRow {
  const p = person(v.key);
  if (!p) throw new Error(`Team row ${v.key} is not a sample person`);
  return {
    key: v.key,
    full: p.full,
    you: !!v.you,
    role: v.role ?? '',
    extra: v.extra || undefined,
    load: v.counts === false ? undefined : loadOf(p.name, tasks),
  };
}

/** Team ① for `role`: summary line, people and closing note; a Member on no project gets the empty state. */
export function getTeam(role: Role, src: TeamSource = {}): TeamData {
  const tasks = src.tasks ?? getTasksState().tasks;
  const projects = src.projects ?? PROJECTS;
  const [nico, rina, dodi] = [entry('nico'), entry('rina'), entry('dodi')];
  if (role === 'pm') {
    const people = [{ ...nico, you: true }, rina, dodi].map((v) => row(v, tasks));
    const total = totalOf(
      people.map((p) => nameOf(p.key)),
      tasks,
    );
    return {
      empty: false,
      summary: `Projects you manage · ${people.length} people · ${total}`,
      people,
    };
  }
  if (role === 'admin') {
    const everyone = listPeople();
    const total = totalOf(
      everyone.map((p) => p.name),
      tasks,
    );
    const variants: Variant[] = [
      { key: 'ayu', you: true, role: 'Admin · No project', counts: false },
      { ...nico, role: 'Project Manager · Atlas Project, Internal Tools' },
      { ...rina, extra: '' },
      dodi,
      { key: 'sri', role: 'Observer · Atlas Project', counts: false },
    ];
    return {
      empty: false,
      summary: `All projects · ${everyone.length} people · ${total}`,
      people: variants.map((v) => row(v, tasks)),
      note: 'Approving new users and changing roles happens in More › Users.',
    };
  }
  const mine = projects.filter((p) => p.members.includes(me(role).name));
  const atlas = mine.find((p) => p.id === 'atlas') ?? mine[0];
  if (!atlas) return { empty: true };
  const variants: Variant[] = [
    { ...dodi, you: true },
    { ...nico, counts: false },
    { ...rina, extra: '', counts: false },
  ];
  return {
    empty: false,
    summary: `Project ${atlas.name} · ${atlas.members.length} people`,
    people: variants.map((v) => row(v, tasks)),
    note: 'Task counts per person are visible only to that person, the project Manager and Admin.',
  };
}
