/**
 * `/api/app/projects` writes (map `phase2-map-projects.md`, pattern `phase2-pola-data.md` §3): create, edit, the
 * status and the Lead, extend the deadline, Move to Trash and its Undo, a phase's status, and the members.
 *
 * Each write reports a failure to the session itself (`applyApiError`) and re-throws it, so the screen can say why.
 * Only a write the server accepted marks reads stale, and it names every read it could have changed (rule 2): the
 * project's own reads, the Projects list, Home (its project counts and agenda), and the Tasks filter's project list.
 */
import { apiDelete, apiJson, apiPatch, apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { homeResource } from './home.api';
import {
  projectActivityResource,
  projectExtensionsResource,
  projectMembersResource,
  projectPlanResource,
  projectResource,
  projectsResource,
} from './projects.api';
import { projectAttentionResource } from './projects.overview.api';
import type {
  ExtensionReasonWire,
  PhaseStatusWire,
  ProjectDetailWire,
  ProjectPriorityWire,
  ProjectRoleWire,
  ProjectStatusWire,
} from './projects.wire';
import { invalidateAll, type Resource, write } from './resource';
import { filterProjectsResource, taskWriteTargets } from './tasks.api';

/** A write outside a resource reports its own failure to the session, then re-throws it (pattern §3). */
async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

const path = (id: string) => `/api/app/projects/${encodeURIComponent(id)}`;

/** What shows projects beside their own pages: the list, Home and the Tasks filter's project list. */
const listTargets = (): Resource<unknown>[] => [
  projectsResource as Resource<unknown>,
  homeResource as Resource<unknown>,
  filterProjectsResource as Resource<unknown>,
];

/** The project's header and its activity, plus everything listing projects. */
const projectTargets = (id: string): Resource<unknown>[] => [
  projectResource(id) as Resource<unknown>,
  projectActivityResource(id) as Resource<unknown>,
  ...listTargets(),
];

export type CreateProjectBody = {
  name: string;
  description?: string;
  status: Extract<ProjectStatusWire, 'draft' | 'active'>;
  priority: ProjectPriorityWire;
  /** Omitted: the creator leads. The Lead becomes a manager whatever role they were given. */
  leadId?: string;
  startDate?: string;
  dueDate?: string;
  members?: { userId: string; role: ProjectRoleWire }[];
};

/** `POST /projects`: the new project's detail; the caller and the Lead become its managers. */
export const createProject = (body: CreateProjectBody): Promise<ProjectDetailWire> =>
  write(() => send(() => apiPost<ProjectDetailWire>('/api/app/projects', body)), listTargets());

/** The fields `PATCH /projects/:id` takes; the status and the Lead have their own routes. */
export type ProjectFieldsBody = {
  name?: string;
  description?: string | null;
  priority?: ProjectPriorityWire;
  startDate?: string | null;
  dueDate?: string | null;
};

export type ProjectChange = {
  fields?: ProjectFieldsBody;
  status?: ProjectStatusWire;
  leadId?: string;
};

/**
 * Saves an edit in the server's three steps, in order: the fields, the status, then the Lead. A step that fails
 * stops the rest and is thrown; whatever was saved before it is still marked stale, so the screens show it.
 */
export async function saveProject(id: string, change: ProjectChange): Promise<void> {
  const steps: (() => Promise<unknown>)[] = [];
  const { fields, status, leadId } = change;
  if (fields && Object.keys(fields).length > 0) steps.push(() => apiPatch(path(id), fields));
  if (status) steps.push(() => apiPost(`${path(id)}/status`, { status }));
  if (leadId) {
    steps.push(() => apiJson(`${path(id)}/lead`, { method: 'PUT', body: { userId: leadId } }));
  }
  let saved = 0;
  try {
    for (const step of steps) {
      await send(step);
      saved += 1;
    }
  } finally {
    // The Lead badge sits on the members; a renamed or moved project changes Home and the lists.
    if (saved > 0) invalidateAll([...projectTargets(id), projectMembersResource(id)]);
  }
}

export type ExtendBody = {
  newDueDate: string;
  reasonCategory: ExtensionReasonWire;
  reason: string;
};

/** `POST /projects/:id/extend-deadline`: the new deadline, recorded in the deadline history. */
export const extendDeadline = (id: string, body: ExtendBody): Promise<void> =>
  write(
    () => send(() => apiPost<unknown>(`${path(id)}/extend-deadline`, body)).then(() => undefined),
    [...projectTargets(id), projectExtensionsResource(id)],
  );

/** What a move to the Trash, or back, touches besides the detail: every task list and count, and the project lists. */
const trashTargets = (id: string): Resource<unknown>[] => [
  projectActivityResource(id) as Resource<unknown>,
  projectAttentionResource(id) as Resource<unknown>,
  ...listTargets(),
  ...taskWriteTargets(),
];

export type TrashResult = { id: string; tasks: number };

/**
 * `DELETE /projects/:id`: the project and its live tasks move to the Trash; `tasks` says how many went along. Its
 * detail is forgotten rather than refetched: kept, the last copy would still show if the project were opened again,
 * where the server now answers 404.
 */
export async function trashProject(id: string): Promise<TrashResult> {
  const moved = await write(() => send(() => apiDelete<TrashResult>(path(id))), trashTargets(id));
  projectResource(id).forget();
  return moved;
}

/** `POST /trash/project/:id/restore`: the Undo of a move to the Trash, with the tasks that went along. */
export const restoreProject = (id: string): Promise<TrashResult> =>
  write(
    () =>
      send(() => apiPost<TrashResult>(`/api/app/trash/project/${encodeURIComponent(id)}/restore`)),
    [projectResource(id) as Resource<unknown>, ...trashTargets(id)],
  );

/** `PATCH /projects/:id/phases/:phaseId` with a new status (Start, Complete). */
export const setPhaseStatus = (id: string, phaseId: string, status: PhaseStatusWire) =>
  write(
    () =>
      send(() =>
        apiPatch<unknown>(`${path(id)}/phases/${encodeURIComponent(phaseId)}`, { status }),
      ).then(() => undefined),
    [
      projectPlanResource(id) as Resource<unknown>,
      projectResource(id) as Resource<unknown>,
      projectActivityResource(id) as Resource<unknown>,
      homeResource as Resource<unknown>,
    ],
  );

/** A member change moves the Members tab, the header (my role, the Lead) and the activity. */
const memberTargets = (id: string): Resource<unknown>[] => [
  projectMembersResource(id) as Resource<unknown>,
  ...projectTargets(id),
];

const memberPath = (id: string, userId: string) =>
  `${path(id)}/members/${encodeURIComponent(userId)}`;

/** `POST /projects/:id/members`: an approved person joins with `role`. */
export const addMember = (id: string, userId: string, role: ProjectRoleWire) =>
  write(
    () =>
      send(() => apiPost<unknown>(`${path(id)}/members`, { userId, role })).then(() => undefined),
    memberTargets(id),
  );

/** `PATCH /projects/:id/members/:userId`; the last manager and the Lead stay managers (409). */
export const setMemberRole = (id: string, userId: string, role: ProjectRoleWire) =>
  write(
    () => send(() => apiPatch<unknown>(memberPath(id, userId), { role })).then(() => undefined),
    memberTargets(id),
  );

/** `DELETE /projects/:id/members/:userId`; their tasks stay in the project. */
export const removeMember = (id: string, userId: string) =>
  write(
    () => send(() => apiDelete<unknown>(memberPath(id, userId))).then(() => undefined),
    memberTargets(id),
  );
