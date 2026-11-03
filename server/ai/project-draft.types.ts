/**
 * Contract of `POST /api/app/projects/draft` ("Ceritakan proyeknya"). Pure types: the UI imports
 * them.
 *
 * Request: `{ text: string }`. `text` is the story, 1 to `PROJECT_DRAFT_TEXT_MAX` characters after
 * trimming (empty: 400 `TEXT_EMPTY`; too long: 400 `TEXT_TOO_LONG`).
 *
 * Nothing is saved: the endpoint only proposes. The client shows the draft, lets the user edit or
 * drop any phase/task, and creates the project (with its phases and tasks) in one call to
 * `POST /api/app/projects` — the extended, still-one, source of truth for what a project takes.
 *
 * Answers:
 * - 200 `ProjectDraftResponse`.
 * - 400 `TEXT_EMPTY` | `TEXT_TOO_LONG`.
 * - 403 `NOT_APP_ROLE`: the caller may not create a project (not PM, Admin or Super-admin).
 * - 429 `RATE_LIMITED` with a `retry-after` header: the quota is shared with "Tulis saja ✦"
 *   (`draftLimiter`), so the two features spend from one per-user bucket.
 * - 503 `AI_DISABLED`: no provider key is configured. 502 `AI_UNAVAILABLE`: the provider failed,
 *   timed out, or answered something unusable. For both, the client falls back to the form and
 *   puts the user's story into the Deskripsi field.
 */
import type { ProjectPriority } from '../pm/enums';

export type ProjectDraftRequest = { text: string };

/** One proposed task inside a draft, before it becomes a real `task` row. */
export type ProjectDraftTask = {
  /** 1 to `TASK_TITLE_MAX` characters. */
  title: string;
  description: string | null;
  priority: ProjectPriority | null;
  /** A name matched to `DEFAULT_TASK_KINDS`; null = the story named none, or named one that is unmatched. */
  kindName: string | null;
  /** `YYYY-MM-DD`, computed by the server from "today" in the app time zone, never by the model. */
  dueDate: string | null;
};

/** One proposed phase inside a draft, with the tasks the story places inside it. */
export type ProjectDraftPhase = {
  /** 1 to `PHASE_NAME_MAX` characters. */
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  tasks: ProjectDraftTask[];
};

export type ProjectDraft = {
  /** 1 to `PROJECT_NAME_MAX` characters. */
  name: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  priority: ProjectPriority | null;
  /** 0 to `PROJECT_DRAFT_PHASES_MAX` phases. */
  phases: ProjectDraftPhase[];
  /** Tasks the story mentions without a clear phase; same shape and budget as a phase's tasks. */
  looseTasks: ProjectDraftTask[];
};

export type ProjectDraftResponse = {
  /** Null only together with a non-null `question`: the story was too unclear to draft anything. */
  draft: ProjectDraft | null;
  question: string | null;
};
