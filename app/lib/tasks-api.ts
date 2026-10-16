/**
 * Client for `/api/app/tasks`. Reads, create and update go through Eden (typed from the S2-03/S2-04
 * routes). The workflow steps use explicit DTOs against the P3 S2-05 contract because those routes are
 * built in parallel. RECONNECT(S2-05): once `app-tasks.workflow.ts` merges, swap `taskStep` for Eden
 * and let the route types replace `TaskStepResult`, `ReopenInput` and `CancelTaskInput`.
 */
import type { CapValue } from '@server/access/capabilities';
import type { PrimaryAction } from '@server/access/task-flow.policy';
import type { TaskCancelCategory } from '@server/pm/enums';
import type { PmCode } from '@server/pm/errors';
import type { TaskCounts, TaskDetail, TaskListItem } from '@server/task/task.dto';
import { type InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { TASK_ERROR_MESSAGES } from '../components/tasks/tasks.copy';
import { client } from './eden';
import {
  ApiError,
  type ApiIssue,
  apiRequest,
  describeApiError,
  jsonRequest,
  redirectToSession,
} from './http';
import type { TaskListQuery } from './tasks-filters';

export type { TaskCounts, TaskDetail, TaskListItem };
/** One keyset page; `caps.createTask` absent = the "Tugas baru" button is hidden. */
export type TaskPage = {
  items: TaskListItem[];
  nextCursor: string | null;
  caps: { createTask?: CapValue };
};

/** React-query keys; invalidate `taskKeys.all` after any write so lists, counts and detail agree. */
export const taskKeys = {
  all: ['tasks'] as const,
  list: (q: TaskListQuery) => ['tasks', 'list', q] as const,
  counts: () => ['tasks', 'counts'] as const,
  detail: (ref: string) => ['tasks', 'detail', ref] as const,
};

/** The steps a list row may offer as its one button; review steps wait for S4 (KB-6) even if the API sends them. */
export const NEXT_STEP_ACTIONS = ['start', 'complete'] as const satisfies readonly PrimaryAction[];
export type NextStepAction = (typeof NEXT_STEP_ACTIONS)[number];

// RECONNECT(S2-05): intersect with the server's `ENABLED_TASK_ACTIONS` once S2-05 exports it.
export function isNextStep(action: PrimaryAction | null | undefined): action is NextStepAction {
  return (NEXT_STEP_ACTIONS as readonly string[]).includes(action ?? '');
}

/** Replaces the message of a known task error code; anything else passes through untouched. */
export function withTaskMessage(err: unknown): unknown {
  if (!(err instanceof ApiError)) return err;
  const message = TASK_ERROR_MESSAGES[err.code as PmCode];
  if (!message) return err;
  return new ApiError({
    message,
    status: err.status,
    code: err.code,
    requestId: err.requestId,
    issues: err.issues,
  });
}

/** One Indonesian sentence for a failed task call. */
export function taskErrorMessage(err: unknown): string {
  return describeApiError(withTaskMessage(err));
}

/**
 * The task on screen is out of date: someone changed it first (409 `STATE_CONFLICT`) or the step no
 * longer fits its status (`WRONG_STATE`). The caller reloads the task data instead of asking the user to.
 */
export function isStaleTaskError(err: unknown): boolean {
  return err instanceof ApiError && (err.code === 'STATE_CONFLICT' || err.code === 'WRONG_STATE');
}

type ErrorValue = { error?: unknown; code?: unknown; requestId?: unknown; issues?: unknown };
type EdenResult<T> = {
  data: T | null;
  error: { status: unknown; value: unknown } | null;
  response?: Response;
};

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

/** Eden `{ data, error }` → data, or throws an `ApiError` with the task wording (401 leaves for login). */
export function unwrapTask<T>(res: EdenResult<T>, onUnauthorized = redirectToSession): T {
  if (!res.error) return res.data as T;
  const status = typeof res.error.status === 'number' ? res.error.status : 500;
  const v = (res.error.value ?? {}) as ErrorValue;
  if (status === 401) onUnauthorized();
  throw withTaskMessage(
    new ApiError({
      message: text(v.error),
      status,
      code: text(v.code),
      requestId: text(v.requestId) ?? res.response?.headers.get('x-request-id') ?? undefined,
      issues: status === 422 && Array.isArray(v.issues) ? (v.issues as ApiIssue[]) : undefined,
    }),
  );
}

export async function fetchTasks(query: TaskListQuery, cursor?: string): Promise<TaskPage> {
  return unwrapTask(
    await client.api.app.tasks.get({ query: cursor ? { ...query, cursor } : query }),
  ) as TaskPage;
}

export async function fetchTaskCounts(): Promise<TaskCounts> {
  return unwrapTask(await client.api.app.tasks.counts.get());
}

export async function fetchTask(ref: string): Promise<TaskDetail> {
  return unwrapTask(await client.api.app.tasks({ ref }).get());
}

/** Keyset pages of one list; `fetchNextPage` follows `nextCursor` until it is null. */
export function useTaskList(
  query: TaskListQuery,
  opts: { initialData?: InfiniteData<TaskPage, string | undefined>; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(query),
    queryFn: ({ pageParam }) => fetchTasks(query, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: opts.initialData,
    enabled: opts.enabled,
  });
}

/** "Tugas saya" counts per schedule group, decided by the server's clock (never the browser's). */
export function useTaskCounts(opts: { initialData?: TaskCounts; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.counts(),
    queryFn: fetchTaskCounts,
    initialData: opts.initialData,
    enabled: opts.enabled,
  });
}

// ---- Writes ----

type CreateBody = Parameters<typeof client.api.app.tasks.post>[0];
type PatchBody = Parameters<ReturnType<typeof client.api.app.tasks>['patch']>[0];
/** POST /tasks body (S2-04); `needsReview` stays off until S4, so it is not offered here. */
export type TaskCreateInput = Omit<CreateBody, 'needsReview'>;
/** PATCH /tasks/:ref body (S2-04). */
export type TaskPatch = Omit<PatchBody, 'needsReview'>;

export async function createTask(input: TaskCreateInput): Promise<TaskDetail> {
  return unwrapTask(await client.api.app.tasks.post(input));
}

export async function updateTask(ref: string, patch: TaskPatch): Promise<TaskDetail> {
  return unwrapTask(await client.api.app.tasks({ ref }).patch(patch));
}

// ---- Workflow steps (contract-typed until S2-05 lands) ----

/** What a step answers (S2-05: `{ task, can }` built from the updated row). */
export type TaskStepResult = { task: Pick<TaskDetail, 'id' | 'number' | 'status'> };
/** `reopen` needs a reason the team can read (3-200 characters, `REASON_REQUIRED`). */
export type ReopenInput = { reason: string };
/** `cancel` needs a category; "other" also needs a note (`CANCEL_NOTE_REQUIRED`). */
export type CancelTaskInput = { category: TaskCancelCategory; note?: string };

type TaskStep = 'start' | 'unstart' | 'complete' | 'reopen' | 'cancel' | 'uncancel';
const stepUrl = (ref: string, step: TaskStep) =>
  `/api/app/tasks/${encodeURIComponent(ref)}/${step}`;

async function taskStep(ref: string, step: TaskStep, body?: unknown): Promise<TaskStepResult> {
  try {
    return await apiRequest<TaskStepResult>(stepUrl(ref, step), jsonRequest('POST', body ?? {}));
  } catch (err) {
    throw withTaskMessage(err);
  }
}

export const startTask = (ref: string) => taskStep(ref, 'start');
export const unstartTask = (ref: string) => taskStep(ref, 'unstart');
export const completeTask = (ref: string) => taskStep(ref, 'complete');
export const reopenTask = (ref: string, input: ReopenInput) => taskStep(ref, 'reopen', input);
export const cancelTask = (ref: string, input: CancelTaskInput) => taskStep(ref, 'cancel', input);
export const uncancelTask = (ref: string) => taskStep(ref, 'uncancel');
