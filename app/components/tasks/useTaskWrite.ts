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
import { WRITE_COPY as COPY } from './task-draft.copy';
import { saveDrafts } from './task-draft.save';
import { initialWriteState, savedItems, writeReducer } from './task-draft.state';
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

  const finish = useCallback((saved: SavedTask[], toast: boolean) => {
    if (toast) {
      notify.success(
        saved.length === 1 && saved[0]
          ? COPY.savedOne(saved[0].title)
          : COPY.savedMany(saved.length),
      );
    }
    dispatch({ type: 'finished' });
    setDone(saved);
  }, []);

  const compose = useCallback(async () => {
    const { state: s, options: o } = latest.current;
    if (draft.loading || !o.projectId || composeBlock(s.text, o.projectId)) return;
    const out = await draft.compose(o.projectId, s.text.trim());
    if (out.kind === 'ok') {
      const defaultKindId = o.defaultKindId(o.projectId);
      dispatch({ type: 'composed', response: out.body, projectId: o.projectId, defaultKindId });
    } else if (out.kind === 'fallback') {
      notify.error(COPY.fallbackTitle, COPY.fallbackBody);
      o.onFallback(s.text);
    } else if (out.kind === 'rate') {
      notify.error(COPY.rateTitle, COPY.rateBody(out.seconds));
    } else {
      notify.error(COPY.composeErrorTitle, out.message);
    }
  }, [draft]);

  const save = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const { items } = latest.current.state;
      const before = savedItems(items).flatMap((i) => (i.saved ? [i.saved] : []));
      const res = await saveDrafts(items, createTask, dispatch);
      if (res.saved.length > 0) void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      if (res.failed > 0) notify.error(COPY.saveErrorTitle, COPY.someFailed(res.failed));
      else if (res.saved.length > 0) finish([...before, ...res.saved], true);
    } finally {
      saving.current = false;
    }
  }, [queryClient, finish]);

  /** A draft was saved through the Ubah form (which already toasted); the last one ends the work. */
  const markSaved = useCallback(
    (id: string, task: SavedTask) => {
      dispatch({ type: 'saved', id, task });
      const { items } = latest.current.state;
      if (items.every((i) => i.id === id || i.status === 'saved')) {
        const earlier = savedItems(items).flatMap((i) => (i.saved ? [i.saved] : []));
        finish([...earlier, task], false);
      }
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
