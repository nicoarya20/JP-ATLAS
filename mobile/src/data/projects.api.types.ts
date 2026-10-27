/**
 * The `/api/app/projects*` wire shapes, field for field as the server sends them.
 *
 * Mirrors `server/project/project.dto.ts`, `project-plan.dto.ts`, `project-activity.dto.ts` and the
 * route files (`server/api/app-projects*.ts`). Written out rather than imported: `server/` is not on
 * this app's module graph, and a hand-written mirror is the place a drift shows up as a type error
 * in the mapper instead of as `undefined` on screen.
 *
 * Two kinds of value live here and must not be confused (K2): **dates** are `YYYY-MM-DD` strings
 * (`dueDate`, `startDate`, a phase's range, a milestone's `dueDate`) and belong to the date helpers;
 * **instants** are ISO datetimes (`reachedAt`, `startedAt`, `createdAt`, `joinedAt`) and go through
 * `instant.ts` with the team's zone.
 *
 * Text the server already composed — `condition.reason` ("1 tugas penting terlambat"), an activity
 * `text`, a refused write's `error` — arrives in Indonesian and is shown as it came (K5). It is
 * never translated here and never rebuilt from parts.
 */

/** `server/pm/enums.ts`. */
export type WireProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'canceled';
export type WireProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type WireProjectMemberRole = 'manager' | 'member' | 'viewer';
export type WireProjectCondition = 'on_track' | 'at_risk' | 'off_track';
export type WirePhaseStatus = 'not_started' | 'in_progress' | 'done';
export type WireExtensionReason = 'scope_change' | 'dependency' | 'resource' | 'other';

/** `server/project/project-list.query.ts` `PROJECT_SORTS`. */
export type WireProjectSort = 'due' | 'name' | 'recent';

/** Keys of a project's `can{}` (`server/access/capabilities.ts` `PROJECT_CAP_KEYS`). */
export type WireProjectCapKey = 'update' | 'trash' | 'createTask' | 'manageKinds';

/** `true` = enabled, a deny code = shown disabled, the key absent = hidden. */
export type WireCap = true | string;

/** A sparse capability map: a missing key means the control is not shown at all. */
export type WireProjectCaps = Partial<Record<WireProjectCapKey, WireCap>>;

/** Id and name only; no email or phone leaves through the project API. */
export type WirePersonRef = { id: string; name: string };

export type WireProgress = {
  done: number;
  total: number;
  /** Capped at 99 until everything is done; null when the project has no tasks at all. */
  percent: number | null;
};

/** `reason` is the server's Indonesian sentence; null when nothing is wrong. */
export type WireCondition = { level: WireProjectCondition; reason: string | null };

export type WireProjectListItem = {
  id: string;
  name: string;
  status: WireProjectStatus;
  priority: WireProjectPriority;
  /** Null once the lead's account is deleted (the FK is SET NULL), so every reader handles it. */
  lead: WirePersonRef | null;
  startDate: string | null;
  dueDate: string | null;
  progress: WireProgress;
  /** Only an `active` project has one; any other status sends null. */
  condition: WireCondition | null;
  /** The caller's role in this project; null for an Admin or PM who sees it without being a member. */
  myRole: WireProjectMemberRole | null;
};

export type WireExtension = {
  id: string;
  projectId: string;
  oldDueDate: string;
  newDueDate: string;
  reasonCategory: WireExtensionReason;
  /** Free text the manager wrote; the mobile card calls this the note. */
  reason: string;
  extendedBy: string | null;
  extendedByName: string | null;
  createdAt: string;
};

export type WireConditionOverride = {
  id: string;
  projectId: string;
  condition: WireProjectCondition;
  reason: string;
  setBy: string | null;
  setByName: string | null;
  expiresAt: string | null;
  clearedAt: string | null;
  createdAt: string;
};

export type WireProjectDetail = WireProjectListItem & {
  description: string | null;
  originalDueDate: string | null;
  /** `live` counts every task not in the Trash, canceled ones too: what a delete takes along. */
  taskCounts: { active: number; overdue: number; live: number };
  can: WireProjectCaps;
  extensionCount: number;
  lastExtension: WireExtension | null;
  conditionOverride: WireConditionOverride | null;
};

/** `GET /api/app/projects` — offset paged, with a real total. */
export type WireProjectPage = {
  items: WireProjectListItem[];
  total: number;
  page: number;
  limit: number;
};

export type WirePhase = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  position: number;
  startDate: string | null;
  endDate: string | null;
  status: WirePhaseStatus;
  startedAt: string | null;
  finishedAt: string | null;
  /** Live, uncanceled tasks pointing at this phase, and how many of those are done. */
  taskCount: number;
  doneCount: number;
};

export type WireMilestone = {
  id: string;
  projectId: string;
  phaseId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  /** ISO instant; null = not reached yet. */
  reachedAt: string | null;
};

/** `GET /api/app/projects/:id/plan` — phases and milestones whole, since both are capped. */
export type WireProjectPlan = {
  phases: WirePhase[];
  milestones: WireMilestone[];
  nextMilestone: WireMilestone | null;
  currentPhase: WirePhase | null;
};

export type WireMemberItem = {
  userId: string;
  name: string;
  image: string | null;
  jobTitle: string | null;
  role: WireProjectMemberRole;
  isLead: boolean;
  /** ISO instant of when they joined. */
  joinedAt: string;
};

/** `GET /api/app/projects/:id/members`, and the body every member write answers with. */
export type WireMemberList = { items: WireMemberItem[] };

export type WireActivityItem = {
  id: string;
  /** Raw action name such as `deadline.extended`; a client may pick an icon from it. */
  action: string;
  /** The server's ready-to-show sentence, in Indonesian (K5). */
  text: string;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
};

/** `GET /api/app/projects/:id/activity` — keyset paged. */
export type WireActivityPage = { items: WireActivityItem[]; nextCursor: string | null };

/** `GET /api/app/projects/:id/extensions` — `limit` only, with the full `total`. */
export type WireExtensionList = {
  items: WireExtension[];
  count: number;
  total: number;
  limit: number;
};

/** `GET /api/app/team/picker` — the people a member or a Lead may be picked from. */
export type WirePickerPerson = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
};
export type WirePickerList = { items: WirePickerPerson[] };

/** `GET /api/app/whoami` — what the app as a whole lets the caller do (closes GAP A-17). */
export type WireAppCaps = {
  createProject: boolean;
  createEvent: boolean;
  dashboard: boolean;
  dev: boolean;
};
export type WireWhoami = { userId: string; name: string; role: string; caps: WireAppCaps };

/** `DELETE /api/app/projects/:id` and `POST /api/app/trash/project/:id/restore`. */
export type WireTrashResult = { id: string; tasks: number };
