/**
 * Client for `/api/app/projects`. Reads go through Eden (typed from the S1-02 routes); writes
 * use explicit DTOs against the P3 S1-03/S1-04 contract (R04 §3.3) because those routes are
 * built in parallel. RECONNECT(S1-03/S1-04): once they merge, swap `projectWrite` calls for Eden
 * and let the route types replace `ProjectCreateInput`/`ProjectPatch`/`ProjectSaved`.
 */
import type { ProjectMemberRole, ProjectPriority, ProjectStatus } from '@server/pm/enums';
import type { PmCode } from '@server/pm/errors';
import type {
  ProjectDetail,
  ProjectListItem,
  ProjectMemberItem,
} from '@server/project/project.dto';
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

// ---- Writes (contract-typed until S1-03/S1-04 land) ----

export type ProjectMemberInput = { userId: string; role: ProjectMemberRole };
/** POST /projects body (S1-03); `status` is limited to draft/active at creation (M24). */
export type ProjectCreateInput = {
  name: string;
  description?: string | null;
  status?: Extract<ProjectStatus, 'draft' | 'active'>;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
  leadId?: string;
  members?: ProjectMemberInput[];
};
/** PATCH /projects/:id body (S1-03); the due date is editable directly in S1 (KB-3). */
export type ProjectPatch = Partial<
  Pick<ProjectCreateInput, 'name' | 'description' | 'priority' | 'startDate' | 'dueDate'>
>;
/** What the UI needs back from a write; R04 answers `{ project }` or the project itself. */
export type ProjectSaved = { id: string; name: string };

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

function readSaved(body: ProjectSaved | { project: ProjectSaved }): ProjectSaved {
  return 'project' in body ? body.project : body;
}

export async function createProject(input: ProjectCreateInput): Promise<ProjectSaved> {
  return readSaved(await projectWrite(BASE, jsonRequest('POST', input)));
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<ProjectSaved> {
  return readSaved(await projectWrite(projectUrl(id), jsonRequest('PATCH', patch)));
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ProjectSaved> {
  return readSaved(await projectWrite(`${projectUrl(id)}/status`, jsonRequest('POST', { status })));
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
