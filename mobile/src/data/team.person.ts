/**
 * Team ②: one person as the server lets the viewer see them (`GET /api/app/team/:userId`). The
 * account-role fact, the phone, the task list and the load are each there only when the server
 * sent them; "may not see the tasks" (`tasksVisible: false`) and "has no open tasks" are told apart.
 */
import { today } from './clock';
import { monthDay } from './dates';
import { leaveText, PROJECT_ROLE, type TeamLoad } from './team';
import {
  type AccountRoleWire,
  type TaskStatusWire,
  type TeamPersonDetailWire,
  teamPersonResource,
} from './team.api';

export const ACCOUNT_ROLE: Record<AccountRoleWire, string> = {
  member: 'Member',
  project_manager: 'Project Manager',
  admin: 'Admin',
  'super-admin': 'Super-admin',
};

export const TASK_STATUS: Record<TaskStatusWire, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  canceled: 'Canceled',
};

/** The server lists at most this many of a person's open tasks (`PERSON_TASKS_MAX`). */
export const PERSON_TASKS_MAX = 20;

export type TeamTaskRow = { no: number; title: string; sub: string; pill: string };

export type TeamPersonData = {
  id: string;
  full: string;
  /** [label, value] facts; a fact the server left out is not in the list. */
  facts: [string, string][];
  leave?: string;
  /** "Projects" when the viewer sees every project (Admin: `accountRole` is sent), else "Shared projects". */
  projectsTitle: string;
  projects: { id: string; name: string; role: string }[];
  /** null: the viewer may see the person but not their work. */
  tasks: {
    load?: TeamLoad;
    rows: TeamTaskRow[];
    /** The list stops at `PERSON_TASKS_MAX` while the load counts more. */
    capped: boolean;
  } | null;
  /** Open work on projects the viewer does not share, never named (privacy D10). */
  elsewhere: boolean;
};

const isOverdue = (due: string | null) => due !== null && due < today();

function factsOf(d: TeamPersonDetailWire): [string, string][] {
  const p = d.person;
  const facts: [string, string | null | undefined][] = [
    ['Job title', p.jobTitle],
    ['Department', p.department],
    ['Email', p.email],
    ['Phone', p.phone],
    ['Account role', d.accountRole && ACCOUNT_ROLE[d.accountRole]],
  ];
  return facts.filter((f): f is [string, string] => !!f[1]);
}

/** Team ② in the screen's shape. */
export function toPerson(d: TeamPersonDetailWire): TeamPersonData {
  const projectName = new Map(d.projects.map((p) => [p.id, p.name]));
  const tasks = d.tasks ?? [];
  const load = d.load ? { active: d.load.active, overdue: d.load.overdue } : undefined;
  return {
    id: d.person.id,
    full: d.person.name,
    facts: factsOf(d),
    leave: leaveText(d.availability),
    projectsTitle: d.accountRole ? 'Projects' : 'Shared projects',
    projects: d.projects.map((p) => ({ id: p.id, name: p.name, role: PROJECT_ROLE[p.role] })),
    tasks: d.tasksVisible
      ? {
          load,
          rows: tasks.map((t) => ({
            no: t.number,
            title: `#${t.number} ${t.title}`,
            sub: [projectName.get(t.projectId), t.dueDate && `Due ${monthDay(t.dueDate)}`]
              .filter(Boolean)
              .join(' · '),
            pill: isOverdue(t.dueDate) ? 'Overdue' : TASK_STATUS[t.status],
          })),
          capped: tasks.length >= PERSON_TASKS_MAX && (load?.active ?? 0) > tasks.length,
        }
      : null,
    elsewhere: d.alsoElsewhere === true || d.load?.alsoElsewhere === true,
  };
}

/** One person as loaded, or null before the first answer. */
export function getTeamPerson(userId: string): TeamPersonData | null {
  const d = teamPersonResource(userId).current();
  return d ? toPerson(d) : null;
}
