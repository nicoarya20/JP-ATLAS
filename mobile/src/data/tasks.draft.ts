/**
 * New task · Just write ✦ on `POST /api/app/tasks/draft` (contract `server/ai/task-draft.types.ts`): a story becomes
 * proposed tasks. That route saves nothing; the screen lets the person fix or drop each draft, then saves the kept
 * ones with `POST /tasks` (tasks.form.write createTasks). Without an AI provider (503 `AI_DISABLED`) or when it fails
 * (502 `AI_UNAVAILABLE`) the screen falls back to Fill form with the story as the title. Every other refusal (400,
 * 403, 404, 409, 429) is shown in the server's words (K5).
 */
import { apiPost } from '@/api/client';
import { type ApiError, isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { type CreateTaskBody, TITLE_MAX } from './tasks.form';
import type { TaskPriorityWire } from './tasks.wire';

/** Longest story the server takes, after trimming (`TASK_DRAFT_TEXT_MAX`, server/ai/task-draft.limits.ts). */
export const DRAFT_TEXT_MAX = 2000;

/** One proposed task; every field but `title` is null when the story does not say it. */
export type TaskDraftWire = {
  title: string;
  assigneeId: string | null;
  /** Why `assigneeId` is null although a name was written; shown next to the draft as it is. */
  assigneeNote: string | null;
  dueDate: string | null;
  priority: TaskPriorityWire | null;
  kindId: string | null;
  description: string | null;
};

/** One question when the story is ambiguous; `options` only for "which member?". */
export type TaskDraftQuestionWire = {
  text: string;
  options?: { id: string; label: string }[];
  /** Indexes into `drafts` of the drafts the answer applies to. */
  draftIndexes: number[];
};

export type TaskDraftResponseWire = {
  drafts: TaskDraftWire[];
  question: TaskDraftQuestionWire | null;
};

/** The refusals after which Just write cannot help now, so Fill form takes over. */
const FALLBACK: ReadonlySet<string> = new Set(['AI_DISABLED', 'AI_UNAVAILABLE']);
export const fallsBackToForm = (e: unknown): e is ApiError => isApiError(e) && FALLBACK.has(e.code);

/** The story as Fill form's title: trimmed and cut to the title limit. */
export const titleFromStory = (text: string) => text.trim().slice(0, TITLE_MAX);

/** Drafts for `text` in project `projectId`; a refusal reaches the session first and is re-thrown. */
export async function draftTasks(projectId: string, text: string): Promise<TaskDraftResponseWire> {
  try {
    return await apiPost<TaskDraftResponseWire>('/api/app/tasks/draft', {
      projectId,
      text: text.trim(),
    });
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

/** A draft as the screen keeps it: the server's proposal, its place in the answer, and whether it is kept. */
export type DraftRow = TaskDraftWire & { key: string; index: number; keep: boolean };

/** The answer's drafts, all kept; `round` tells one Compose's drafts from the next. */
export const draftRows = (r: TaskDraftResponseWire, round: number): DraftRow[] =>
  r.drafts.map((d, index) => ({ ...d, key: `${round}-${index}`, index, keep: true }));

/** "Which member?" answered: `memberId` becomes the assignee of every draft the question is about. */
export const answerQuestion = (
  rows: readonly DraftRow[],
  q: TaskDraftQuestionWire,
  memberId: string,
): DraftRow[] =>
  rows.map((r) => (q.draftIndexes.includes(r.index) ? { ...r, assigneeId: memberId } : r));

/** What keeps Save off: no draft kept, or a kept one without a title. */
export type DraftsProblem = 'none' | 'title';
export function draftsProblem(rows: readonly DraftRow[]): DraftsProblem | null {
  const kept = rows.filter((r) => r.keep);
  if (!kept.length) return 'none';
  return kept.some((r) => !r.title.trim()) ? 'title' : null;
}

/** A kept draft as `POST /tasks` takes it; without a priority it gets Fill form's default, Medium. */
export function draftBody(projectId: string, r: DraftRow): CreateTaskBody {
  const description = r.description?.trim();
  return {
    projectId,
    title: r.title.trim(),
    priority: r.priority ?? 'medium',
    ...(r.assigneeId ? { assigneeId: r.assigneeId } : {}),
    ...(r.dueDate ? { dueDate: r.dueDate } : {}),
    ...(r.kindId ? { kindId: r.kindId } : {}),
    ...(description ? { description } : {}),
  };
}
