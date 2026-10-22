/**
 * Client for `/api/app/projects` and the people picker, all through Eden (typed from the S1-02,
 * S1-03 and S1-04 routes). Errors come back as `ApiError` with the project wording.
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
import { ApiError, type ApiIssue, describeApiError, redirectToSession } from './http';
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

/** Eden pastes path params as they are, so ids are escaped here. */
const pathId = (id: string) => encodeURIComponent(id);
const PICKER_PAGE_SIZE = 20;

export async function fetchProjects(query: ProjectListQuery): Promise<ProjectPage> {
  return unwrap(await client.api.app.projects.get({ query }));
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).get());
}

export async function fetchProjectMembers(id: string): Promise<ProjectMemberItem[]> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).members.get()).items;
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

export async function createProject(input: ProjectCreateInput): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects.post(input));
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).patch(patch));
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).status.post({ status }));
}

/** PUT /:id/lead: another manager becomes the Lead ("Pengelola utama"); session only. */
export async function setProjectLead(id: string, userId: string): Promise<ProjectSaved> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).lead.put({ userId }));
}

// ---- Member writes (Eden, S1-04): each answers the fresh member list ----

const member = (id: string, userId: string) =>
  client.api.app.projects({ id: pathId(id) }).members({ userId: pathId(userId) });

export async function addProjectMember(
  id: string,
  input: ProjectMemberInput,
): Promise<ProjectMemberItem[]> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).members.post(input)).items;
}

export async function changeProjectMemberRole(
  id: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<ProjectMemberItem[]> {
  return unwrap(await member(id, userId).patch({ role })).items;
}

export async function removeProjectMember(
  id: string,
  userId: string,
): Promise<ProjectMemberItem[]> {
  return unwrap(await member(id, userId).delete()).items;
}

// ---- People picker (Eden, S1-04) ----

/** One pickable person: name and job title only, never email or phone (Q8). */
export type PickerPerson = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
};

/**
 * GET /api/app/team/picker. Without `projectId` only those who may create projects may search;
 * with it the caller must belong to that project (a 403/404 then means "no picker for you").
 */
export async function searchPeople(
  q: string,
  opts: { projectId?: string; limit?: number } = {},
): Promise<PickerPerson[]> {
  const query = {
    limit: opts.limit ?? PICKER_PAGE_SIZE,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(opts.projectId ? { projectId: opts.projectId } : {}),
  };
  return unwrap(await client.api.app.team.picker.get({ query })).items;
}
