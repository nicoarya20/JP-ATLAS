/**
 * Pure side of "Tulis saja ✦" (U1): checks before asking the AI, the mapping of a draft to the task
 * form's values, and the text a failed AI call leaves in Judul. The AI contract is `server/ai`'s.
 */
import { TASK_DRAFT_TEXT_MAX } from '@server/ai/task-draft.limits';
import type { TaskDraft } from '@server/ai/task-draft.types';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '@server/task/task.limits';
import { DATES_LOCALE } from '~/lib/date-config';
import { WRITE_COPY as COPY } from './task-draft.copy';
import { newTaskValues, type TaskFormValues } from './task-form';

/** Why "Susun" cannot run yet, or null when it can. Length counts after trimming, like the server. */
export function composeBlock(text: string, projectId: string | null): string | null {
  const used = text.trim().length;
  if (!projectId) return COPY.needProject;
  if (used === 0) return COPY.needText;
  if (used > TASK_DRAFT_TEXT_MAX) return COPY.tooLong(TASK_DRAFT_TEXT_MAX);
  return null;
}

/** Characters the server will count. */
export const storyLength = (text: string): number => text.trim().length;

/** What a draft becomes in the form: blanks fall back to the form's own defaults (Sedang, project kind). */
export function draftToValues(
  draft: TaskDraft,
  projectId: string,
  defaultKindId: string | null,
): TaskFormValues {
  return {
    ...newTaskValues(projectId, draft.assigneeId),
    title: draft.title,
    priority: draft.priority ?? 'medium',
    dueDate: draft.dueDate,
    description: draft.description ?? '',
    kindId: draft.kindId ?? defaultKindId,
  };
}

/**
 * The user's story as a form with the story in Judul, for when the AI cannot answer. A story longer
 * than a title keeps its full text in Deskripsi, so nothing the user wrote is lost.
 */
export function storyToValues(
  text: string,
  projectId: string | null,
  base: TaskFormValues,
): TaskFormValues {
  const story = text.trim();
  const oneLine = story.replace(/\s+/g, ' ');
  const title = oneLine.slice(0, TASK_TITLE_MAX);
  const keepFull = oneLine.length > TASK_TITLE_MAX || story !== oneLine;
  return {
    ...base,
    projectId,
    title,
    description: keepFull ? story.slice(0, TASK_DESCRIPTION_MAX) : base.description,
  };
}

const dateFmt = new Intl.DateTimeFormat(DATES_LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC', // the calendar date is already decided; a zone would move the day
});

/** "9 Oktober 2026" (`D MMMM YYYY`, as the form's date input) for a `YYYY-MM-DD` date. */
export function longDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}
