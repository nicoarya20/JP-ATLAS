/**
 * Writes to `/api/app/projects*` and `/api/app/trash/project/*`, and the one place that says what
 * each one made stale.
 *
 * §2 of `docs/phase2-pola-data.md` is the whole reason this file is shaped like a list of
 * invalidations: no screen unmounts, so a store nobody invalidates keeps showing the old value on
 * *every* screen still alive, silently and with no error anywhere. So every write names everything
 * it could have changed, and names it wide — a status change moves a project in and out of
 * `perhatian=1`, changes its condition, writes an activity row and shifts Home's project list, so
 * one request too many is far cheaper than a number that is quietly wrong.
 *
 * `write()` invalidates only on success. A refused write changed nothing on the server, so nothing
 * on screen is out of date, and the error is thrown on — never swallowed — for the screen to show
 * with the server's own sentence (K5).
 *
 * **No client-side guards.** The prototype refused a rename that clashed with another project, the
 * removal of the last manager and the Lead's own removal before asking. The server has no unique
 * name at all, and the other two it decides when the write lands
 * (`server/project/member.service.ts`), with a sentence for each. Guessing first is how a screen
 * ends up refusing something the server would have allowed.
 */
import { apiDelete, apiJson, apiPatch, apiPost } from '@/api/client';

import { homeResource } from './home.api';
import {
  projectActivity,
  projectDetail,
  projectExtensions,
  projectLists,
  projectMembers,
  projectPlan,
  projectReads,
} from './projects.api';
import { projectTaskReads } from './projects.api.tasks';
import type {
  WireExtensionReason,
  WireMemberList,
  WirePhaseStatus,
  WireProjectDetail,
  WireProjectMemberRole,
  WireProjectPriority,
  WireProjectStatus,
  WireTrashResult,
} from './projects.api.types';
import { type Resource, write } from './resource';
import { taskCounts, taskLists } from './tasks.api';

const path = (id: string, rest = '') => `/api/app/projects/${encodeURIComponent(id)}${rest}`;

/**
 * Everything a write to project `id` may have changed.
 *
 * The project's own reads first, then every project list ever fetched (any of them may hold this
 * row), then Home — whose project list, briefing and counters are built from the same projects.
 */
function touchedBy(id: string): Resource<unknown>[] {
  return [
    projectDetail(id),
    projectPlan(id),
    projectMembers(id),
    projectExtensions(id),
    projectActivity(id),
    ...projectLists(),
    ...projectReads.details(),
    homeResource,
  ] as Resource<unknown>[];
}

/** The same, plus everything that counts tasks: a project write can move or remove its tasks. */
const touchedWithTasks = (id: string): Resource<unknown>[] =>
  [...touchedBy(id), ...projectTaskReads(), ...taskLists(), taskCounts] as Resource<unknown>[];

/** The fields `PATCH /projects/:id` accepts. `status` and `leadId` have routes of their own. */
export type ProjectPatch = {
  name?: string;
  description?: string | null;
  priority?: WireProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
};

/** What the Edit form has to say, across the three routes the server splits it over. */
export type ProjectEditInput = ProjectPatch & {
  /** Sent only when it differs from what the project has now. */
  status?: WireProjectStatus;
  /** Sent only when it differs; the server refuses a candidate who is not a manager. */
  leadId?: string;
};

/**
 * Saves the Edit form. One button, up to three requests, because the server keeps the status and
 * the Lead on routes of their own (`status` and `leadId` are unknown keys on `PATCH`, which answers
 * 422 for them).
 *
 * They run in a fixed order — fields, then status, then Lead — and stop at the first refusal. There
 * is no transaction across routes, so a later failure leaves the earlier changes saved: the stores
 * are invalidated for exactly that reason, so the form the user is looking at reloads into what the
 * server actually has, and the refusal is thrown on with the server's sentence. Hiding a partial
 * save would be worse: the screen would then disagree with the server with no way to notice.
 */
export async function saveProject(id: string, input: ProjectEditInput): Promise<void> {
  const { status, leadId, ...fields } = input;
  try {
    if (Object.keys(fields).length > 0) {
      await apiPatch<WireProjectDetail>(path(id), fields);
    }
    if (status) await apiPost<WireProjectDetail>(path(id, '/status'), { status });
    if (leadId)
      await apiJson<WireProjectDetail>(path(id, '/lead'), {
        method: 'PUT',
        body: { userId: leadId },
      });
  } finally {
    // Whatever landed before the refusal is saved, so the stores are stale either way.
    for (const r of touchedBy(id)) r.invalidate();
  }
}

/** Moves the project to one of the five statuses. */
export const setProjectStatus = (id: string, status: WireProjectStatus): Promise<unknown> =>
  write(() => apiPost<WireProjectDetail>(path(id, '/status'), { status }), touchedBy(id));

/** Adds an approved person with a project role. An existing member is refused with a sentence. */
export const addProjectMember = (
  id: string,
  userId: string,
  role: WireProjectMemberRole,
): Promise<WireMemberList> =>
  write(() => apiPost<WireMemberList>(path(id, '/members'), { userId, role }), touchedBy(id));

/** Changes one member's project role. The last manager and the Lead stay managers (the server says so). */
export const changeProjectMemberRole = (
  id: string,
  userId: string,
  role: WireProjectMemberRole,
): Promise<WireMemberList> =>
  write(
    () => apiPatch<WireMemberList>(path(id, `/members/${encodeURIComponent(userId)}`), { role }),
    touchedBy(id),
  );

/** Removes a member. Not yourself, not the last manager, not the Lead — all decided by the server. */
export const removeProjectMember = (id: string, userId: string): Promise<WireMemberList> =>
  write(
    () => apiDelete<WireMemberList>(path(id, `/members/${encodeURIComponent(userId)}`)),
    touchedBy(id),
  );

export type ExtendInput = {
  newDueDate: string;
  reasonCategory: WireExtensionReason;
  reason: string;
};

/** Moves the deadline later with a reason; writes the history row and an activity line with it. */
export const extendProjectDeadline = (id: string, input: ExtendInput): Promise<unknown> =>
  write(() => apiPost(path(id, '/extend-deadline'), input), touchedBy(id));

/** Starts or completes a phase. Its task counts feed the project's progress, so tasks are named too. */
export const setPhaseStatus = (
  id: string,
  phaseId: string,
  status: WirePhaseStatus,
): Promise<unknown> =>
  write(
    () => apiPatch(path(id, `/phases/${encodeURIComponent(phaseId)}`), { status }),
    touchedWithTasks(id),
  );

/**
 * Moves the project to the Trash, taking its tasks along. Answers how many went with it, which is
 * what the Undo snack and the sheet both talk about.
 */
export const trashProject = (id: string): Promise<WireTrashResult> =>
  write(() => apiDelete<WireTrashResult>(path(id)), touchedWithTasks(id));

/**
 * Brings a trashed project back, tasks and all. This is what Undo does: there is no local "held"
 * project to put back any more, and whether it may come back is the server's to decide — it checks
 * the retention window, which is why `restore` is deliberately not a `can{}` key.
 */
export const restoreProject = (id: string): Promise<WireTrashResult> =>
  write(
    () => apiPost<WireTrashResult>(`/api/app/trash/project/${encodeURIComponent(id)}/restore`),
    touchedWithTasks(id),
  );

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  status?: 'draft' | 'active';
  priority?: WireProjectPriority;
  leadId?: string;
  startDate?: string | null;
  dueDate?: string | null;
  members?: { userId: string; role: WireProjectMemberRole }[];
};

/**
 * Creates a project and answers its detail, so the screen can go straight to the new id instead of
 * guessing a route. Only `draft` and `active` may be an initial status; the caller and the Lead
 * become managers server-side.
 */
export const createProject = (input: CreateProjectInput): Promise<WireProjectDetail> =>
  write(() => apiPost<WireProjectDetail>('/api/app/projects', input), [
    ...projectLists(),
    homeResource,
  ] as Resource<unknown>[]);
