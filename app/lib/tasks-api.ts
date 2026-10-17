/**
 * Client for `/api/app/tasks`: reads, create/update (S2-03/S2-04) and the workflow steps (S2-05),
 * all through Eden so the route types are the contract.
 */
import type { CapValue } from '@server/access/capabilities';
import type { PrimaryAction } from '@server/access/task-flow.policy';
import type { PmCode } from '@server/pm/errors';
import type { TaskCounts, TaskDetail, TaskListItem } from '@server/task/task.dto';
import { ENABLED_TASK_ACTIONS } from '@server/task/task.limits';
import type { TimelineEntry } from '@server/task/task-timeline.query';
import type { TransitionResult } from '@server/task/task-workflow.service';
import { type InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { TASK_ERROR_MESSAGES } from '../components/tasks/tasks.copy';
import { client } from './eden';
import { ApiError, type ApiIssue, describeApiError, redirectToSession } from './http';
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
  timeline: (ref: string) => ['tasks', 'timeline', ref] as const,
  highlights: (projectId: string) => ['tasks', 'highlights', projectId] as const,
};

/**
 * The steps a list row may offer as its one button: start/complete, kept only while the server routes
 * them (`ENABLED_TASK_ACTIONS`), so review steps wait for S4 (KB-6) even if the API sends them.
 */
const ROW_STEPS = ['start', 'complete'] as const satisfies readonly PrimaryAction[];
export const NEXT_STEP_ACTIONS = ROW_STEPS.filter((a) =>
  (ENABLED_TASK_ACTIONS as readonly string[]).includes(a),
);
export type NextStepAction = (typeof ROW_STEPS)[number];

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
  opts: {
    initialData?: InfiniteData<TaskPage, string | undefined>;
    initialDataUpdatedAt?: number;
    enabled?: boolean;
  } = {},
) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(query),
    queryFn: ({ pageParam }) => fetchTasks(query, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: opts.initialData,
    initialDataUpdatedAt: opts.initialDataUpdatedAt,
    enabled: opts.enabled,
  });
}

/** "Tugas saya" counts per schedule group, decided by the server's clock (never the browser's). */
export function useTaskCounts(
  opts: { initialData?: TaskCounts; initialDataUpdatedAt?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: taskKeys.counts(),
    queryFn: fetchTaskCounts,
    initialData: opts.initialData,
    initialDataUpdatedAt: opts.initialDataUpdatedAt,
    enabled: opts.enabled,
  });
}

// ---- Writes ----

type CreateBody = Parameters<typeof client.api.app.tasks.post>[0];
type PatchBody = Parameters<ReturnType<typeof client.api.app.tasks>['patch']>[0];
/** POST /tasks body (S2-04); `needsReview` stays off until S4, so it is not offered here. */
export type TaskCreateInput = Omit<CreateBody, 'needsReview'>;
/** PATCH /tasks/:ref body (S2-04). */
export type TaskPatch = Omit<NonNullable<PatchBody>, 'needsReview'>;

export async function createTask(input: TaskCreateInput): Promise<TaskDetail> {
  return unwrapTask(await client.api.app.tasks.post(input));
}

export async function updateTask(ref: string, patch: TaskPatch): Promise<TaskDetail> {
  return unwrapTask(await client.api.app.tasks({ ref }).patch(patch));
}

// ---- Workflow steps (S2-05) ----

type StepApi = ReturnType<typeof client.api.app.tasks>;
/** What a step answers: `{ task, can }` built from the updated row. */
export type TaskStepResult = Omit<Extract<TransitionResult, { ok: true }>, 'ok'>;
/** `reopen` needs a reason the team can read (3-200 characters, `REASON_REQUIRED`). */
export type ReopenInput = Parameters<StepApi['reopen']['post']>[0];
/** `cancel` needs a category; "other" also needs a note (`CANCEL_NOTE_REQUIRED`). */
export type CancelTaskInput = Parameters<StepApi['cancel']['post']>[0];

const step = (ref: string) => client.api.app.tasks({ ref });
// Eden types a step's data as a union with the refusal bodies; `unwrapTask` already threw for those.
const done = <T>(res: EdenResult<T>) => unwrapTask(res) as TaskStepResult;

export const startTask = async (ref: string) => done(await step(ref).start.post());
export const unstartTask = async (ref: string) => done(await step(ref).unstart.post());
export const completeTask = async (ref: string) => done(await step(ref).complete.post());
export const reopenTask = async (ref: string, input: ReopenInput) =>
  done(await step(ref).reopen.post(input));
export const cancelTask = async (ref: string, input: CancelTaskInput) =>
  done(await step(ref).cancel.post(input));
export const uncancelTask = async (ref: string) => done(await step(ref).uncancel.post());

// ---- Checklist, comments and timeline (S2-06) ----

/** The checklist as `GET /tasks/:ref` and every step write answer it. */
export type TaskChecklist = TaskDetail['checklist'];
export type ChecklistItem = TaskChecklist['items'][number];
/** One entry of the one stream of comments and activity, newest first. */
export type { TimelineEntry };
export type TimelinePage = { items: TimelineEntry[]; nextCursor: string | null };
export type TaskComment = Extract<TimelineEntry, { kind: 'comment' }>;
type StepPatch = { text?: string; isDone?: boolean; position?: number };

export async function fetchTimeline(ref: string, cursor?: string): Promise<TimelinePage> {
  return unwrapTask(await step(ref).timeline.get({ query: cursor ? { cursor } : {} }));
}

/** Keyset pages of one task's timeline; "Muat lebih lama" calls `fetchNextPage`. */
export function useTimeline(ref: string) {
  return useInfiniteQuery({
    queryKey: taskKeys.timeline(ref),
    queryFn: ({ pageParam }) => fetchTimeline(ref, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export const addStep = async (ref: string, text: string) =>
  unwrapTask(await step(ref).checklist.post({ text }));
export const patchStep = async (ref: string, itemId: string, patch: StepPatch) =>
  unwrapTask(await step(ref).checklist({ itemId }).patch(patch));
export const removeStep = async (ref: string, itemId: string) =>
  unwrapTask(await step(ref).checklist({ itemId }).delete());

export const addComment = async (ref: string, body: string) =>
  unwrapTask(await step(ref).comments.post({ body }));
export const editComment = async (ref: string, commentId: string, body: string) =>
  unwrapTask(await step(ref).comments({ commentId }).patch({ body }));
export const removeComment = async (ref: string, commentId: string) =>
  unwrapTask(await step(ref).comments({ commentId }).delete());
