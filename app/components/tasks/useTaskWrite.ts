/**
 * Everything "Tulis saja ✦" does on Tugas baru, tied together (U1): the story and drafts (reducer),
 * Susun, the answer to the AI's question, the batch save, and what happens when the work is done.
 * Nothing is saved except by `save()` or by the Ubah form; there is no autosave.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { notify } from '~/components/ui/notify';
import { createTask, taskKeys } from '~/lib/tasks-api';
import type { SavedTask } from './TaskCreateForm';
import { composeBlock } from './task-draft';
import { type Finished, finishedAfterEdit, runCompose, runSave } from './task-draft.flow';
import { initialWriteState, writeReducer } from './task-draft.state';
import { useTaskDraft } from './useTaskDraft';

type Options = {
  projectId: string | null;
  /** The kind a draft gets when the story names none: the project's own default. */
  defaultKindId: (projectId: string) => string | null;
  /** The AI cannot answer: the page moves to the form with the user's text. */
  onFallback: (text: string) => void;
  /** Everything wanted is saved; `saved` lists the tasks in screen order. */
  onFinished: (saved: SavedTask[]) => void;
};

export function useTaskWrite(options: Options) {
  const [state, dispatch] = useReducer(writeReducer, initialWriteState);
  const draft = useTaskDraft();
  const queryClient = useQueryClient();
  const [done, setDone] = useState<SavedTask[] | null>(null);
  // Async steps read the latest state and options at call time, like `useApiMutation` does.
  const latest = useRef({ state, options });
  latest.current = { state, options };
  const saving = useRef(false);

  // Leave only after the render that released the unsaved-changes warning (same pattern as TaskCreateForm).
  useEffect(() => {
    if (done) latest.current.options.onFinished(done);
  }, [done]);

  const finish = useCallback((finished: Finished | null) => {
    if (!finished) return;
    dispatch({ type: 'finished' });
    setDone(finished.saved);
  }, []);

  const compose = useCallback(() => {
    const { state: s, options: o } = latest.current;
    if (draft.loading) return Promise.resolve();
    return runCompose({
      projectId: o.projectId,
      text: s.text,
      defaultKindId: o.defaultKindId,
      request: draft.compose,
      dispatch,
      notice: notify,
      onFallback: o.onFallback,
    });
  }, [draft]);

  const save = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      finish(
        await runSave({
          items: latest.current.state.items,
          create: createTask,
          dispatch,
          notice: notify,
          onCreated: () => void queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        }),
      );
    } finally {
      saving.current = false;
    }
  }, [queryClient, finish]);

  const markSaved = useCallback(
    (id: string, task: SavedTask) => {
      dispatch({ type: 'saved', id, task });
      finish(finishedAfterEdit(latest.current.state.items, id, task));
    },
    [finish],
  );

  return {
    state,
    blocked: composeBlock(state.text, options.projectId),
    composing: draft.loading,
    setText: (text: string) => dispatch({ type: 'text', text }),
    compose,
    toggle: (id: string) => dispatch({ type: 'toggle', id }),
    answer: (optionId: string) => dispatch({ type: 'answer', optionId }),
    backToText: () => dispatch({ type: 'backToText' }),
    save,
    markSaved,
  };
}

export type TaskWrite = ReturnType<typeof useTaskWrite>;
