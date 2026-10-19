/**
 * The steps of "Tulis saja ✦" that talk to the outside (U1), as plain async functions: what Susun does
 * with each answer of the server, and what ends the work after a save. `useTaskWrite` only binds them
 * to React; they take their calls and notices as arguments so they run without a browser.
 */
import type { SavedTask } from './TaskCreateForm';
import { composeBlock } from './task-draft';
import { WRITE_COPY as COPY } from './task-draft.copy';
import { type CreateOne, saveDrafts } from './task-draft.save';
import { type DraftItem, savedItems, type WriteAction } from './task-draft.state';
import type { DraftOutcome } from './useTaskDraft';

export type Notice = {
  success: (message: string) => void;
  error: (title: string, message: string) => void;
};
type Dispatch = (action: WriteAction) => void;

export type ComposeDeps = {
  projectId: string | null;
  text: string;
  defaultKindId: (projectId: string) => string | null;
  request: (projectId: string, text: string) => Promise<DraftOutcome>;
  dispatch: Dispatch;
  notice: Notice;
  /** The AI cannot answer: continue in the form with the user's text. */
  onFallback: (text: string) => void;
};

/** Asks for drafts and shows what came back. It never saves a task. */
export async function runCompose(d: ComposeDeps): Promise<void> {
  if (!d.projectId || composeBlock(d.text, d.projectId)) return;
  const out = await d.request(d.projectId, d.text.trim());
  if (out.kind === 'ok') {
    const defaultKindId = d.defaultKindId(d.projectId);
    d.dispatch({ type: 'composed', response: out.body, projectId: d.projectId, defaultKindId });
  } else if (out.kind === 'fallback') {
    d.notice.error(COPY.fallbackTitle, COPY.fallbackBody);
    d.onFallback(d.text);
  } else if (out.kind === 'rate') {
    d.notice.error(COPY.rateTitle, COPY.rateBody(out.seconds));
  } else {
    d.notice.error(COPY.composeErrorTitle, out.message);
  }
}

const tasksOf = (items: DraftItem[]): SavedTask[] =>
  savedItems(items).flatMap((i) => (i.saved ? [i.saved] : []));

/** Tasks the work ended with, in screen order, once everything wanted is saved; shown with one toast. */
export type Finished = { saved: SavedTask[] };

/** Saves the picked drafts. Returns the finished work when none failed, else null (the cards say why). */
export async function runSave(d: {
  items: DraftItem[];
  create: CreateOne;
  dispatch: Dispatch;
  notice: Notice;
  /** Refresh the task lists after at least one task was created. */
  onCreated: () => void;
}): Promise<Finished | null> {
  const before = tasksOf(d.items);
  const res = await saveDrafts(d.items, d.create, d.dispatch);
  if (res.saved.length > 0) d.onCreated();
  if (res.failed > 0) {
    d.notice.error(COPY.saveErrorTitle, COPY.someFailed(res.failed));
    return null;
  }
  if (res.saved.length === 0) return null;
  const saved = [...before, ...res.saved];
  d.notice.success(
    saved.length === 1 && saved[0] ? COPY.savedOne(saved[0].title) : COPY.savedMany(saved.length),
  );
  return { saved };
}

/** A draft was saved through the Ubah form (which toasted by itself): the work ends when it was the last one. */
export function finishedAfterEdit(
  items: DraftItem[],
  id: string,
  task: SavedTask,
): Finished | null {
  if (!items.every((i) => i.id === id || i.status === 'saved')) return null;
  return { saved: [...tasksOf(items.filter((i) => i.id !== id)), task] };
}
