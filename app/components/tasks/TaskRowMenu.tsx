/**
 * The ⋯ menu of a list row or card (S6 D1): today it holds "Hapus tugas" only, shown when the
 * server's `can.trash` says the viewer may delete (creator, project manager, Admin). It sits above
 * the row's covering link, so tapping it never opens the task.
 */
import { ActionIcon, Box, Menu } from '@mantine/core';
import { FiMoreHorizontal } from 'react-icons/fi';
import type { TaskListItem } from '~/lib/tasks-api';
import { TaskDeleteItem } from './TaskDeleteItem';
import { isShown } from './task-caps';
import { DELETE_COPY } from './tasks.copy';
import { useTaskDelete } from './useTaskDelete';

export type TaskRowMenuTask = Pick<TaskListItem, 'number' | 'can'>;

/** Whether the row offers any menu item at all. */
export const hasRowMenu = (task: Pick<TaskListItem, 'can'>) => isShown(task.can.trash);

export function TaskRowMenu({ task }: { task: TaskRowMenuTask }) {
  const remove = useTaskDelete();
  if (!hasRowMenu(task)) return null;
  return (
    <Box pos="relative" style={{ zIndex: 1, flexShrink: 0 }}>
      {/* Tooltip must not wrap Menu.Target (it swallows the click); the icon has an aria-label instead. */}
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            loading={remove.loading}
            aria-label={DELETE_COPY.rowMenuLabel(task.number)}
          >
            <FiMoreHorizontal size="1.25em" aria-hidden />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown maw={320}>
          <TaskDeleteItem
            cap={task.can.trash}
            onDelete={() => void remove.run({ ref: String(task.number) })}
          />
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
