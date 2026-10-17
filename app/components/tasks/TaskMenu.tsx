/**
 * The ⋯ menu of a task detail: "Batalkan tugas" with a plain note that canceling is not deleting.
 * There is no Hapus here (X1-Q1: the task Trash arrives in S6). "Ubah tugas" opens the edit page and
 * is offered only when the server's `can.update` is true.
 */
import { ActionIcon, Menu, Stack, Text } from '@mantine/core';
import type { TaskDetail } from '@server/task/task.dto';
import { FiEdit2, FiMoreHorizontal, FiXCircle } from 'react-icons/fi';
import { Link } from 'react-router';
import { capReason, isShown } from './task-caps';
import { openCancelTaskModal } from './task-reason';
import { DETAIL_COPY } from './tasks.copy';
import { useTaskActions } from './useTaskActions';

export type TaskMenuTask = Pick<TaskDetail, 'number' | 'can'>;

/** The items this viewer is offered, in menu order; the menu is not rendered when there are none. */
export const menuItemsOf = (task: TaskMenuTask) => [
  ...(task.can.update === true ? (['edit'] as const) : []),
  ...(isShown(task.can.cancel) ? (['cancel'] as const) : []),
];

export const hasTaskMenu = (task: TaskMenuTask) => menuItemsOf(task).length > 0;

export function TaskMenu({ task }: { task: TaskMenuTask }) {
  const { cancel } = useTaskActions();
  if (!hasTaskMenu(task)) return null;
  const items = menuItemsOf(task);
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
        {items.includes('edit') && (
          <Menu.Item
            component={Link}
            to={`/app/tasks/${ref}/edit`}
            leftSection={<FiEdit2 size="1.25em" aria-hidden />}
          >
            {DETAIL_COPY.edit}
          </Menu.Item>
        )}
        {items.includes('cancel') && (
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
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
