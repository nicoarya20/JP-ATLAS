/**
 * The "Isi form" way to create a task: the task form wired to the create call. It takes the values it
 * opens with (`initialValues`) and reports the saved task through `onSubmitted`, so a page can open it
 * blank, preset to a project, or, once "Tulis saja ✦" ships, filled from an AI draft (pass a new `key`
 * to refill a form that is already on screen). It does not navigate; the caller decides where to go.
 */

import type { IsoDate } from '@server/metrics/types';
import type { TaskFormProject } from '@server/task/task-form.query';
import { useEffect, useState } from 'react';
import type { ProjectMemberItem } from '~/lib/projects-api';
import { TaskForm } from './TaskForm';
import { type TaskFormValues, taskFieldErrors, toCreateTaskInput } from './task-form';
import { useTaskActions } from './useTaskActions';

export type SavedTask = { id: string; number: number; title: string };

export type TaskCreateFormProps = {
  /** Projects the viewer may add a task to, from the server. */
  projects: TaskFormProject[];
  /** What the form opens with; changes after the first render are ignored (use `key` to refill). */
  initialValues: TaskFormValues;
  /** Members of the project the form opens with, so the first render needs no fetch. */
  initialMembers?: ProjectMemberItem[];
  viewer: { id: string; name: string };
  /** The server's today (team time zone) for the quick due buttons. */
  today: IsoDate;
  /** Where the Batal button goes. */
  cancelTo: string;
  /** Batal calls this instead of going to `cancelTo`; for a form shown in a dialog. */
  onCancel?: () => void;
  /** Called once the task is saved and the unsaved-changes guard has been released. */
  onSubmitted: (task: SavedTask) => void;
};

export function TaskCreateForm({ onSubmitted, initialValues, ...rest }: TaskCreateFormProps) {
  const { create } = useTaskActions();
  const [saved, setSaved] = useState<SavedTask | null>(null);
  // Report after the form re-rendered without its unsaved-changes block, or the leave would be asked again.
  useEffect(() => {
    if (saved) onSubmitted(saved);
  }, [saved, onSubmitted]);

  return (
    <TaskForm
      mode="create"
      initial={initialValues}
      submitting={create.loading}
      onSubmit={async (values) => {
        const res = await create.run(toCreateTaskInput(values));
        if (res.ok) {
          setSaved(res.data);
          return null;
        }
        return taskFieldErrors(res.error) ?? {};
      }}
      {...rest}
    />
  );
}
