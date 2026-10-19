/**
 * Shapes the Team reads return (S6 M02, P7 §5). The success shape *is* the response body, so the
 * route can send it unchanged; a refusal is the only branch carrying `ok`.
 *
 * The optional keys are the privacy contract (D10): `load`, `alsoElsewhere`, `tasks` and
 * `summary.active/overdue` are **absent** for a caller who may not see them — never `null` and
 * never `0`, so a leak shows up as a missing key in the JSON and the per-role tests of M03 can
 * simply scan for the key names.
 */

import type { Role } from '../permissions';
import type { ProjectMemberRole, TaskStatus } from '../pm/enums';
import type { PmCode } from '../pm/errors';

/**
 * `name` is self first then A-Z; `active` is most open tasks first and `overdue` most overdue
 * first, both then name (managers and Admin only, the ones who may see other people's numbers).
 */
export type TeamSort = 'name' | 'active' | 'overdue';

export type ListTeamInput = {
  /** Narrows the list to one project; a project the caller may not see answers `NOT_FOUND`. */
  projectId?: string;
  /** Part of a person's name to look for. */
  q?: string;
  sort?: TeamSort;
  limit?: number;
  offset?: number;
};

/** A project the viewer shares with the person (or any live project, for Admin), with the person's role in it. */
export type TeamProjectRef = { id: string; name: string; role: ProjectMemberRole };

/**
 * Open-task numbers of one person, counted only over the projects the viewer may count
 * (`LoadScope`). `alsoElsewhere` says the person also has open tasks outside that scope, and
 * carries no number on purpose: the viewer may not know how much work lies elsewhere.
 */
export type TeamLoad = { active: number; overdue: number; alsoElsewhere?: true };

export type TeamPerson = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
  isSelf: boolean;
  projects: TeamProjectRef[];
  load?: TeamLoad;
};

/**
 * `people` and `projects` describe the whole filtered team, not the page: `people` equals `total`
 * and `projects` counts the live projects the caller may see. `active`/`overdue` sum the load of
 * the people on this page, and are absent for a caller who may see nobody else's numbers.
 */
export type TeamSummary = { people: number; projects: number; active?: number; overdue?: number };

export type ListTeamOk = { summary: TeamSummary; people: TeamPerson[]; total: number };
export type Refused = { ok: false; code: PmCode };
export type ListTeamResult = ListTeamOk | Refused;

/** Contact details; `phone` reaches only the person themselves and Admin (Q8). */
export type TeamPersonProfile = {
  id: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  email: string;
  phone?: string;
};

/** One open task of the person, as the detail page lists them (most overdue first). */
export type TeamTaskRef = {
  number: number;
  title: string;
  status: TaskStatus;
  /** `YYYY-MM-DD` or null. */
  dueDate: string | null;
  projectId: string;
};

export type GetPersonOk = {
  person: TeamPersonProfile;
  /**
   * The stored account role, read like the user directory reads it. **Absent** (never `null`)
   * unless the viewer is Admin or Super-admin: a colleague's account role is not for colleagues.
   */
  accountRole?: Role;
  projects: TeamProjectRef[];
  /** At most `PERSON_TASKS_MAX`, and only within the viewer's `LoadScope`. */
  tasks?: TeamTaskRef[];
  /** False when the viewer may see the person but not their work; `tasks` and `load` are then absent. */
  tasksVisible: boolean;
  load?: TeamLoad;
  alsoElsewhere?: true;
};
export type GetPersonResult = GetPersonOk | Refused;

/** A refusal narrows a result; the success branch deliberately has no `ok` key (it is the body). */
export function isRefused(r: ListTeamResult | GetPersonResult): r is Refused {
  return 'ok' in r && r.ok === false;
}
