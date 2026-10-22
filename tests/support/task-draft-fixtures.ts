/** Shared fixtures of the "Tulis saja ✦" tests (U1): the AI's two-draft answer and a state composed from it. */
import {
  initialWriteState,
  type WriteAction,
  type WriteState,
  writeReducer,
} from '../../app/components/tasks/task-draft.state';
import type { TaskDraft, TaskDraftResponse } from '../../server/ai/task-draft.types';

export const STORY =
  'Rina perbaiki halaman login besok, penting. Dodi siapkan data uji sebelum Jumat.'; // test-only

export const draftOf = (over: Partial<TaskDraft> = {}): TaskDraft => ({
  title: 'Tugas',
  assigneeId: null,
  assigneeNote: null,
  dueDate: null,
  priority: null,
  kindId: null,
  description: null,
  ...over,
}); // test-only

/** The two drafts of wireframe ⑤. */
export const TWO_DRAFTS: TaskDraftResponse = {
  drafts: [
    draftOf({
      title: 'Perbaiki halaman login',
      assigneeId: 'u-rina',
      dueDate: '2026-10-08',
      priority: 'high',
      kindId: 'k-bug',
    }),
    draftOf({
      title: 'Siapkan data uji',
      assigneeId: 'u-dodi',
      dueDate: '2026-10-09',
      priority: 'medium',
      kindId: 'k-task',
    }),
  ],
  question: null,
}; // test-only

/** Folds actions into a state, like the page does. */
export function run(actions: WriteAction[], from: WriteState = initialWriteState): WriteState {
  return actions.reduce(writeReducer, from);
}

export const composed = (response: TaskDraftResponse = TWO_DRAFTS): WriteAction => ({
  type: 'composed',
  response,
  projectId: 'p-1',
  defaultKindId: 'k-task',
});
