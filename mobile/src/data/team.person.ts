// Team ② for the screens: one person as the server lets this viewer see them — contact facts, the
// projects they share, and their open tasks when the viewer may count them.
import { today } from './clock';
import { monthDay } from './dates';
import type { Role } from './sample';
import { statusWord } from './tasks.api.values';
import type { Load } from './team';
import { availabilityText, projectLabel } from './team';
import {
  PERSON_TASKS_MAX,
  type TeamPersonDetailWire,
  type TeamProjectRefWire,
  type TeamTaskRefWire,
  teamPerson,
} from './team.api';

export type TeamTaskRow = { no: number; title: string; sub: string; pill: string };

/** One fact row; `undefined` values are dropped, because an absent key means "not for you". */
export type PersonFact = [label: string, value: string];

export type TeamPersonData = {
  full: string;
  email: string;
  /** A recorded leave, or empty. */
  status: string;
  /** Job title, Division, Email, Phone, Account role — only the ones the server sent. */
  facts: PersonFact[];
  /** "Projects" for an Admin, who sees them all; "Shared projects" for everyone else (GAP A-18). */
  projectsTitle: string;
  projects: { id: string; name: string }[];
  /**
   * null when the server said `tasksVisible: false` — the viewer may see the person but not their
   * work. An empty `rows` with `tasks` present means the person has no open task, which is a
   * different sentence.
   */
  tasks: { load?: Load; rows: TeamTaskRow[]; capped: boolean } | null;
  /**
   * They also have open tasks on projects this viewer does not share. The project **names** are
   * deliberately never sent (GAP A-17), so the copy names none.
   */
  elsewhere?: string;
};

const FACT = {
  job: 'Job title',
  division: 'Division',
  email: 'Email',
  phone: 'Phone',
  role: 'Account role',
} as const;

/** The stored account role as it is shown; an Admin is the only viewer the server sends it to. */
const ACCOUNT_ROLE: Record<string, string> = {
  member: 'Member',
  project_manager: 'Project Manager',
  admin: 'Admin',
  'super-admin': 'Super-admin',
};

const projectName = (projects: readonly TeamProjectRefWire[], id: string): string | undefined =>
  projects.find((p) => p.id === id)?.name;

/**
 * One open task as a row. "Overdue" wins over the status word, and it is decided against the
 * server's own today (K1) — the phone's date would move the pill on and off by a day.
 */
export function taskRow(
  task: TeamTaskRefWire,
  projects: readonly TeamProjectRefWire[],
): TeamTaskRow {
  const name = projectName(projects, task.projectId);
  const due = task.dueDate ? `Due ${monthDay(task.dueDate)}` : undefined;
  const overdue = task.dueDate !== null && task.dueDate < today();
  return {
    no: task.number,
    title: `#${task.number} ${task.title}`,
    sub: [name, due].filter(Boolean).join(' · '),
    pill: overdue ? 'Overdue' : statusWord(task.status),
  };
}

/** Team ② from the store: null until the person has answered (or when they answered 404). */
export function getTeamPerson(userId: string, role: Role | null): TeamPersonData | null {
  return personOf(teamPerson(userId).current(), role);
}

/** The mapping on its own, so a test can hand it a DTO without a store. */
export function personOf(
  wire: TeamPersonDetailWire | null,
  role: Role | null,
): TeamPersonData | null {
  if (!wire) return null;
  const { person, projects } = wire;
  const facts: PersonFact[] = [];
  if (person.jobTitle) facts.push([FACT.job, person.jobTitle]);
  if (person.department) facts.push([FACT.division, person.department]);
  facts.push([FACT.email, person.email]);
  // Both of these are absent for a viewer who may not see them, so the row goes rather than
  // showing a blank one (GAP A-19 for the role, B-17 for the phone).
  if (person.phone) facts.push([FACT.phone, person.phone]);
  if (wire.accountRole) {
    facts.push([FACT.role, ACCOUNT_ROLE[wire.accountRole] ?? wire.accountRole]);
  }
  const rows = (wire.tasks ?? []).map((t) => taskRow(t, projects));
  return {
    full: person.name,
    email: person.email,
    status: availabilityText(wire.availability),
    facts,
    projectsTitle: role === 'admin' ? 'Projects' : 'Shared projects',
    projects: projects.map((p) => ({ id: p.id, name: projectLabel(p) })),
    tasks: wire.tasksVisible
      ? {
          load: wire.load ? { active: wire.load.active, overdue: wire.load.overdue } : undefined,
          rows,
          capped: rows.length >= PERSON_TASKS_MAX,
        }
      : null,
    elsewhere: wire.alsoElsewhere
      ? `${person.name} also has open tasks on projects you do not share. Those are visible only to their project's Manager and Admin.`
      : undefined,
  };
}
