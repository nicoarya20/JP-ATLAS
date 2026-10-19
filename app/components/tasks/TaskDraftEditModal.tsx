/** "Ubah" on a draft: the usual task form, filled from the draft, in a dialog. Saving it creates the task (once). */
import { Modal, useMatches } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { TaskFormProject } from '@server/task/task-form.query';
import { useCallback } from 'react';
import type { ProjectMemberItem } from '~/lib/projects-api';
import { type SavedTask, TaskCreateForm } from './TaskCreateForm';
import { WRITE_COPY as COPY } from './task-draft.copy';
import type { DraftItem } from './task-draft.state';

type Props = {
  /** The draft being changed; null keeps the dialog closed. */
  item: DraftItem | null;
  projects: TaskFormProject[];
  members?: ProjectMemberItem[];
  viewer: { id: string; name: string };
  today: IsoDate;
  cancelTo: string;
  onClose: () => void;
  onSaved: (id: string, task: SavedTask) => void;
};

export function TaskDraftEditModal({ item, onClose, onSaved, ...form }: Props) {
  const itemId = item?.id ?? null;
  // Stable, because the form reports from an effect keyed on this function.
  const submitted = useCallback(
    (task: SavedTask) => {
      if (itemId) onSaved(itemId, task);
    },
    [itemId, onSaved],
  );
  // A phone gets the whole screen: the form is long and the keyboard covers half of a small dialog.
  const fullScreen = useMatches({ base: true, sm: false });
  return (
    <Modal
      opened={item !== null}
      onClose={onClose}
      title={COPY.editTitle}
      size="lg"
      fullScreen={fullScreen}
      // A click outside must not throw away what was typed.
      closeOnClickOutside={false}
    >
      {item && (
        <TaskCreateForm
          key={item.id}
          initialValues={item.values}
          onCancel={onClose}
          onSubmitted={submitted}
          {...form}
        />
      )}
    </Modal>
  );
}
