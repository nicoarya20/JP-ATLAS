/**
 * Contract of `POST /api/app/tasks/draft` ("Tulis saja ✦", A1). Pure types: the UI imports them.
 *
 * Request: `{ projectId: string, text: string }`. `text` is the story, 1 to `TASK_DRAFT_TEXT_MAX`
 * characters after trimming (empty: 400 `TEXT_EMPTY`; too long: 400 `TEXT_TOO_LONG`).
 *
 * Nothing is saved: the endpoint only proposes. The client shows the drafts, lets the user fix them,
 * and creates each accepted one with `POST /api/app/tasks` (source of truth for what a task takes).
 *
 * Answers:
 * - 200 `TaskDraftResponse`.
 * - 400 `TEXT_EMPTY` | `TEXT_TOO_LONG`.
 * - 403 `NOT_MEMBER` (a Pemantau, or a PM who is not in the project) and 409 `PROJECT_IN_TRASH` /
 *   `WRONG_STATE`: the same decision as creating a task there. 404 `NOT_FOUND` when the project
 *   does not exist or the caller cannot see it.
 * - 429 `RATE_LIMITED` with a `retry-after` header: too many drafts per minute for this user.
 * - 503 `AI_DISABLED`: no provider key is configured. 502 `AI_UNAVAILABLE`: the provider failed,
 *   timed out, or answered something unusable. For both, the client falls back to the form and
 *   puts the user's text into the Judul field.
 */
import type { ProjectPriority } from '../pm/enums';

export type TaskDraftRequest = { projectId: string; text: string };

/** One proposed task. Every field but `title` is null when the story does not say it. */
export type TaskDraft = {
  /** 1 to `TASK_TITLE_MAX` characters. */
  title: string;
  /** A Pengelola or Anggota of the project, matched by the code on the member's display name. */
  assigneeId: string | null;
  /**
   * Why `assigneeId` is null although a name was written: the name is not a worker of this project,
   * or it fits several members (then `question` asks which). Show it next to the draft.
   */
  assigneeNote: string | null;
  /** `YYYY-MM-DD`, computed by the server from "today" in the app time zone, never by the model. */
  dueDate: string | null;
  priority: ProjectPriority | null;
  /** An active task kind of this project; null when the story names none (the form then defaults). */
  kindId: string | null;
  description: string | null;
};

/** One question when the story is ambiguous. */
export type TaskDraftQuestion = {
  text: string;
  /**
   * Candidates when the question is "which member?". Choosing one sets `assigneeId` of every draft
   * listed in `draftIndexes` (indexes into `drafts`). Absent for an open question.
   */
  options?: Array<{ id: string; label: string }>;
  /** Drafts the question is about (empty for an open question about the whole story). */
  draftIndexes: number[];
};

export type TaskDraftResponse = {
  /** 0 to `TASK_DRAFTS_MAX` drafts; 0 only together with a `question`. */
  drafts: TaskDraft[];
  question: TaskDraftQuestion | null;
};
