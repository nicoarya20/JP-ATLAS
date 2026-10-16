/**
 * Client for `/api/app/projects`. Reads and project writes go through Eden (typed from the S1-02
 * and S1-03 routes). Member writes still use explicit DTOs against the P3 S1-04 contract (R04 §3.3)
 * because that route is built in parallel. RECONNECT(S1-04): once it merges, swap the member
 * `projectWrite` calls for Eden and let the route types replace `ProjectMemberInput`.
 */
import type { ProjectMemberRole, ProjectPriority, ProjectStatus } from '@server/pm/enums';
import type { PmCode } from '@server/pm/errors';
import type {
  ProjectDetail,
  ProjectListItem,
  ProjectMemberItem,
} from '@server/project/project.dto';
import type { ProjectInitialStatus } from '@server/project/project.limits';
import { PROJECT_ERROR_MESSAGES } from '../components/projects/projects.copy';
import { client } from './eden';
import {
  ApiError,
  type ApiIssue,
  apiRequest,
  describeApiError,
  jsonRequest,
  redirectToSession,
} from './http';
import type { ProjectListQuery } from './projects-filters';

export type { ProjectDetail, ProjectListItem, ProjectMemberItem };
export type ProjectPage = { items: ProjectListItem[]; total: number; page: number; limit: number };

/** React-query keys; invalidate `projectKeys.all` after any write so list and detail agree. */
export const projectKeys = {
  all: ['projects'] as const,
  list: (q: ProjectListQuery) => ['projects', 'list', q] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  members: (id: string) => ['projects', 'detail', id, 'members'] as const,
};

/** Replaces the message of a known project error code; anything else passes through untouched. */
export function withProjectMessage(err: unknown): unknown {
  if (!(err instanceof ApiError)) return err;
  const message = PROJECT_ERROR_MESSAGES[err.code as PmCode];
  if (!message) return err;
  return new ApiError({
    message,
    status: err.status,
    code: err.code,
    requestId: err.requestId,
    issues: err.issues,
  });
}

/** One Indonesian sentence for a failed project call. */
export function projectErrorMessage(err: unknown): string {
  return describeApiError(withProjectMessage(err));
}

type ErrorValue = { error?: unknown; code?: unknown; requestId?: unknown; issues?: unknown };
type EdenResult<T> = {
  data: T | null;
  error: { status: unknown; value: unknown } | null;
  response?: Response;
};

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

/** Eden `{ data, error }` → data, or throws the same `ApiError` as `apiRequest` (401 leaves for login). */
export function unwrap<T>(res: EdenResult<T>, onUnauthorized = redirectToSession): T {
  if (!res.error) return res.data as T;
  const status = typeof res.error.status === 'number' ? res.error.status : 500;
  const v = (res.error.value ?? {}) as ErrorValue;
  if (status === 401) onUnauthorized();
  throw withProjectMessage(
    new ApiError({
      message: text(v.error),
      status,
      code: text(v.code),
      requestId: text(v.requestId) ?? res.response?.headers.get('x-request-id') ?? undefined,
      issues: status === 422 && Array.isArray(v.issues) ? (v.issues as ApiIssue[]) : undefined,
    }),
  );
}

export async function fetchProjects(query: ProjectListQuery): Promise<ProjectPage> {
  return unwrap(await client.api.app.projects.get({ query }));
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  return unwrap(await client.api.app.projects({ id }).get());
}

export async function fetchProjectMembers(id: string): Promise<ProjectMemberItem[]> {
  return unwrap(await client.api.app.projects({ id }).members.get()).items;
}

// ---- Project writes (Eden, S1-03) ----

export type ProjectMemberInput = { userId: string; role: ProjectMemberRole };
/** POST /projects body; `status` is limited to draft/active at creation (M24). */
export type ProjectCreateInput = {
  name: string;
  description?: string | null;
  status?: ProjectInitialStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
  leadId?: string;
  members?: ProjectMemberInput[];
};
/** PATCH /projects/:id body; the due date is editable directly in S1 (KB-3). */
export type ProjectPatch = Partial<
  Pick<ProjectCreateInput, 'name' | 'description' | 'priority' | 'startDate' | 'dueDate'>
>;
/** Every project write answers the fresh detail of the project. */
export type ProjectSaved = ProjectDetail;

/**
 * The write bodies typed by hand: the routes' `oneOf` enum fields reach Eden as `never`/`undefined`,
 * so no literal value type-checks. Narrow cast, removed after the `oneOf` fix of S1-04 merges.
 */
const edenBody = <T>(body: T) => body as never;

export async function createProject(input: ProjectCreateInput): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects.post(edenBody(input)));
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects({ id }).patch(edenBody(patch)));
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects({ id }).status.post(edenBody({ status })));
}

// ---- Member writes (contract-typed until S1-04 lands) ----

const BASE = '/api/app/projects';
const projectUrl = (id: string) => `${BASE}/${encodeURIComponent(id)}`;
const memberUrl = (id: string, userId: string) =>
  `${projectUrl(id)}/members/${encodeURIComponent(userId)}`;

async function projectWrite<T>(url: string, init: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(url, init);
  } catch (err) {
    throw withProjectMessage(err);
  }
}

export async function addProjectMember(id: string, member: ProjectMemberInput): Promise<void> {
  await projectWrite(`${projectUrl(id)}/members`, jsonRequest('POST', member));
}

export async function changeProjectMemberRole(
  id: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<void> {
  await projectWrite(memberUrl(id, userId), jsonRequest('PATCH', { role }));
}

export async function removeProjectMember(id: string, userId: string): Promise<void> {
  await projectWrite(memberUrl(id, userId), jsonRequest('DELETE'));
}

// ---- People picker (contract-typed until S1-04 lands) ----

/** One pickable person: name and job title only, never email or phone (Q8). */
export type PickerPerson = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
};

/**
 * GET /api/app/team/picker (P3 S1-04). RECONNECT(S1-04): the route is still a stub on this branch,
 * so it answers 404 and the form goes on without extra members; swap for Eden once it merges.
 */
export async function searchPeople(q: string, limit = 20): Promise<PickerPerson[]> {
  const qs = new URLSearchParams({ limit: String(limit), ...(q.trim() ? { q: q.trim() } : {}) });
  const body = await apiRequest<{ items: PickerPerson[] } | PickerPerson[]>(
    `/api/app/team/picker?${qs}`,
  );
  return Array.isArray(body) ? body : body.items;
}

/** The picker route is not there yet (S1-04 in parallel): the form treats it as "no picker". */
export const isPickerMissing = (err: unknown) => err instanceof ApiError && err.status === 404;
