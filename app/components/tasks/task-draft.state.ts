/**
 * State of "Tulis saja ✦" as a pure reducer (U1): the story, the drafts with their pick and save
 * status, and the one question. Nothing here saves; `task-draft.save.ts` does that, one draft at a time.
 */
import type { TaskDraftQuestion, TaskDraftResponse } from '@server/ai/task-draft.types';
import type { SavedTask } from './TaskCreateForm';
import { draftToValues } from './task-draft';
import type { TaskFormValues } from './task-form';

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type DraftItem = {
  id: string;
  /** What will be saved; "Ubah" and the AI's question both change it. */
  values: TaskFormValues;
  /** Why the AI left Yang mengerjakan empty; gone once someone is chosen. */
  note: string | null;
  selected: boolean;
  status: DraftStatus;
  error: string | null;
  saved: SavedTask | null;
};

export type WriteState = {
  text: string;
  /** `write`: the story box; `result`: the drafts and the question below the story. */
  stage: 'write' | 'result';
  items: DraftItem[];
  question: TaskDraftQuestion | null;
  /** The label of the option the user picked, kept so the answer stays visible. */
  answer: string | null;
  /** Set while a batch runs: how many drafts it saves. */
  batch: { total: number } | null;
  /** Everything wanted is saved; the page is about to leave, so the unsaved warning stops. */
  finished: boolean;
};

export const initialWriteState: WriteState = {
  text: '',
  stage: 'write',
  items: [],
  question: null,
  answer: null,
  batch: null,
  finished: false,
};

export type WriteAction =
  | { type: 'text'; text: string }
  | {
      type: 'composed';
      response: TaskDraftResponse;
      projectId: string;
      defaultKindId: string | null;
    }
  | { type: 'toggle'; id: string }
  | { type: 'answer'; optionId: string }
  | { type: 'backToText' }
  | { type: 'batchStarted'; total: number }
  | { type: 'batchEnded' }
  | { type: 'saving'; id: string }
  | { type: 'saved'; id: string; task: SavedTask }
  | { type: 'failed'; id: string; error: string }
  | { type: 'finished' };

/** A draft the Simpan button will save: picked, and not saved yet (a failed one is tried again). */
export const isPending = (item: DraftItem): boolean =>
  item.selected && (item.status === 'idle' || item.status === 'failed');

export const savedItems = (items: DraftItem[]): DraftItem[] =>
  items.filter((i) => i.status === 'saved');

/** Text or drafts that would be lost by leaving. */
export const hasUnsavedWork = (s: WriteState): boolean =>
  !s.finished && (s.text.trim() !== '' || s.items.some((i) => i.status !== 'saved'));

const patch = (items: DraftItem[], id: string, change: Partial<DraftItem>): DraftItem[] =>
  items.map((i) => (i.id === id ? { ...i, ...change } : i));

export function writeReducer(s: WriteState, a: WriteAction): WriteState {
  switch (a.type) {
    case 'text':
      return { ...s, text: a.text };
    case 'composed':
      return {
        ...s,
        stage: 'result',
        question: a.response.question,
        answer: null,
        items: a.response.drafts.map((d, n) => ({
          id: `draft-${n + 1}`,
          values: draftToValues(d, a.projectId, a.defaultKindId),
          note: d.assigneeNote,
          selected: true,
          status: 'idle',
          error: null,
          saved: null,
        })),
      };
    case 'toggle':
      return {
        ...s,
        items: s.items.map((i) => (i.id === a.id ? { ...i, selected: !i.selected } : i)),
      };
    case 'answer': {
      const q = s.question;
      const option = q?.options?.find((o) => o.id === a.optionId);
      if (!q || !option) return s;
      const targets = new Set(q.draftIndexes);
      return {
        ...s,
        question: null,
        answer: option.label,
        items: s.items.map((i, n) =>
          targets.has(n) ? { ...i, values: { ...i.values, assigneeId: option.id }, note: null } : i,
        ),
      };
    }
    case 'backToText':
      return { ...s, stage: 'write', items: [], question: null, answer: null };
    case 'batchStarted':
      return { ...s, batch: { total: a.total } };
    case 'batchEnded':
      return { ...s, batch: null };
    case 'saving':
      return { ...s, items: patch(s.items, a.id, { status: 'saving', error: null }) };
    case 'saved':
      return { ...s, items: patch(s.items, a.id, { status: 'saved', saved: a.task, error: null }) };
    case 'failed':
      return { ...s, items: patch(s.items, a.id, { status: 'failed', error: a.error }) };
    case 'finished':
      return { ...s, finished: true };
    default:
      return s;
  }
}
