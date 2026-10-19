/**
 * Strict reading of what the model returned. The answer is untrusted input: only the known keys are
 * copied, enums that do not match become null, strings are cleaned and cut to their limits, and an
 * answer of the wrong shape (or with more drafts than allowed) is rejected as a whole.
 */
import { PROJECT_PRIORITIES, type ProjectPriority } from '../pm/enums';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../task/task.limits';
import { type DueToken, WEEKDAYS, type Weekday } from './task-draft.dates';
import { TASK_DRAFT_NAME_MAX, TASK_DRAFT_QUESTION_MAX, TASK_DRAFTS_MAX } from './task-draft.limits';
import { dropControl } from './task-draft.text';

/** A draft as the model wrote it, before names, kinds and dates are resolved by code. */
export type RawDraft = {
  title: string;
  description: string | null;
  /** The name as written in the story, or `ME_MARKER` when the writer takes it themself. */
  assignee: string | null;
  due: DueToken | null;
  priority: ProjectPriority | null;
  /** A kind name from the offered list; matched to an id by code. */
  kind: string | null;
};

export type ModelOutput = { drafts: RawDraft[]; question: string | null };

/** What the model writes in `assignee` when the author of the story does the work. */
export const ME_MARKER = '@me';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A trimmed string without control characters and at most `max` long; null when not a string or empty. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = dropControl(v).trim();
  return s ? s.slice(0, max) : null;
}

const asInt = (v: unknown): number | null => (Number.isInteger(v) ? (v as number) : null);

function parseDue(v: unknown): DueToken | null {
  if (!isObj(v)) return null;
  switch (v.kind) {
    case 'offset': {
      const days = asInt(v.days);
      return days === null ? null : { kind: 'offset', days };
    }
    case 'weekday':
      return typeof v.weekday === 'string' && (WEEKDAYS as readonly string[]).includes(v.weekday)
        ? { kind: 'weekday', weekday: v.weekday as Weekday, next: v.next === true }
        : null;
    case 'monthday': {
      const day = asInt(v.day);
      return day === null ? null : { kind: 'monthday', day, month: asInt(v.month) };
    }
    case 'date':
      return typeof v.iso === 'string' ? { kind: 'date', iso: v.iso } : null;
    default:
      return null;
  }
}

function parseDraft(v: unknown): RawDraft | null {
  if (!isObj(v)) return null;
  // A title is one line: line breaks and runs of spaces collapse before the limit is applied.
  const title = cleanText(
    typeof v.title === 'string' ? v.title.replace(/\s+/g, ' ') : v.title,
    TASK_TITLE_MAX,
  );
  if (!title) return null;
  const priority = PROJECT_PRIORITIES.find((p) => p === v.priority) ?? null;
  return {
    title,
    description: cleanText(v.description, TASK_DESCRIPTION_MAX),
    assignee: cleanText(v.assignee, TASK_DRAFT_NAME_MAX),
    due: parseDue(v.due),
    priority,
    kind: cleanText(v.kind, TASK_DRAFT_NAME_MAX),
  };
}

/** The validated answer, or null when it must not be used (wrong shape, too many or untitled drafts, nothing to show). */
export function parseModelOutput(raw: unknown): ModelOutput | null {
  if (!isObj(raw) || !Array.isArray(raw.drafts) || raw.drafts.length > TASK_DRAFTS_MAX) {
    return null;
  }
  const drafts: RawDraft[] = [];
  for (const item of raw.drafts) {
    const d = parseDraft(item);
    if (!d) return null;
    drafts.push(d);
  }
  const question = cleanText(raw.question, TASK_DRAFT_QUESTION_MAX);
  // No drafts and no question leaves the user with nothing: the form is the better fallback.
  return drafts.length === 0 && !question ? null : { drafts, question };
}
