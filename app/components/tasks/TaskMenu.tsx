/**
 * The ⋯ menu of a task detail: "Batalkan tugas" with a plain note that canceling is not deleting.
 * There is no Hapus here (X1-Q1: the task Trash arrives in S6). "Ubah tugas" joins in G19 with the
 * edit form, so no dead item is shown meanwhile.
 */
import { ActionIcon, Menu, Stack, Text } from '@mantine/core';
import type { TaskDetail } from '@server/task/task.dto';
import { FiMoreHorizontal, FiXCircle } from 'react-icons/fi';
import { capReason, isShown } from './task-caps';
import { openCancelTaskModal } from './task-reason';
import { DETAIL_COPY } from './tasks.copy';
import { useTaskActions } from './useTaskActions';

export type TaskMenuTask = Pick<TaskDetail, 'number' | 'can'>;

/** True when the menu has at least one item for this viewer; otherwise it is not rendered at all. */
export const hasTaskMenu = (task: TaskMenuTask) => isShown(task.can.cancel);

export function TaskMenu({ task }: { task: TaskMenuTask }) {
  const { cancel } = useTaskActions();
  if (!hasTaskMenu(task)) return null;
  const ref = String(task.number);
  const blocked = capReason(task.can.cancel);
  const openCancel = () => openCancelTaskModal((input) => cancel.run({ ref, input }));
  return (
    // Tooltip must not wrap Menu.Target (it swallows the click); the icon has an aria-label instead.
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={DETAIL_COPY.menuLabel}>
          <FiMoreHorizontal size="1.25em" aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown maw={320}>
        <Menu.Item
          color="danger"
          leftSection={<FiXCircle size="1.25em" aria-hidden />}
          disabled={task.can.cancel !== true}
          onClick={openCancel}
        >
          <Stack gap={2}>
            <Text inherit>{DETAIL_COPY.cancel}</Text>
            <Text size="xs" c="dimmed">
              {blocked ?? DETAIL_COPY.cancelHint}
            </Text>
          </Stack>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
