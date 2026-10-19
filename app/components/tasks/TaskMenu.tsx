/**
 * The ⋯ menu of a task detail: "Batalkan tugas" with a plain note that canceling is not deleting,
 * and "Hapus tugas" (S6 D1, T1: no dialog, the toast offers "Urungkan"). "Ubah tugas" opens the edit
 * page and is offered only when the server's `can.update` is true; each item follows its own `can`.
 */
import { ActionIcon, Menu, Stack, Text } from '@mantine/core';
import type { TaskDetail } from '@server/task/task.dto';
import { FiEdit2, FiMoreHorizontal, FiXCircle } from 'react-icons/fi';
import { Link } from 'react-router';
import { TaskDeleteItem } from './TaskDeleteItem';
import { capReason, isShown } from './task-caps';
import { openCancelTaskModal } from './task-reason';
import { DETAIL_COPY } from './tasks.copy';
import { useTaskActions } from './useTaskActions';
import { useTaskDelete } from './useTaskDelete';

export type TaskMenuTask = Pick<TaskDetail, 'number' | 'can'>;

/** The items this viewer is offered, in menu order; the menu is not rendered when there are none. */
export const menuItemsOf = (task: TaskMenuTask) => [
  ...(task.can.update === true ? (['edit'] as const) : []),
  ...(isShown(task.can.cancel) ? (['cancel'] as const) : []),
  ...(isShown(task.can.trash) ? (['delete'] as const) : []),
];

export const hasTaskMenu = (task: TaskMenuTask) => menuItemsOf(task).length > 0;

/** `afterDelete` runs once the task is in the Trash, so the page can leave a task that no longer exists. */
export function TaskMenu({ task, afterDelete }: { task: TaskMenuTask; afterDelete?: () => void }) {
  const { cancel } = useTaskActions();
  const remove = useTaskDelete(afterDelete);
  if (!hasTaskMenu(task)) return null;
  const items = menuItemsOf(task);
  const ref = String(task.number);
  const blocked = capReason(task.can.cancel);
  const openCancel = () => openCancelTaskModal((input) => cancel.run({ ref, input }));
  return (
    // Tooltip must not wrap Menu.Target (it swallows the click); the icon has an aria-label instead.
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          loading={remove.loading}
          aria-label={DETAIL_COPY.menuLabel}
        >
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
        {items.includes('delete') && (
          <>
            {items.length > 1 && <Menu.Divider />}
            <TaskDeleteItem cap={task.can.trash} onDelete={() => void remove.run({ ref })} />
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
