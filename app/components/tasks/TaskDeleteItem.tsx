/**
 * The "Hapus tugas" entry shared by the detail menu and the list-row menu (S6 D1). It is danger
 * coloured and says where the task goes; when the server's `can.trash` is a deny code the item stays
 * visible but greyed out, with the reason under it.
 */
import { Menu, Stack, Text } from '@mantine/core';
import type { CapValue } from '@server/access/capabilities';
import { FiTrash2 } from 'react-icons/fi';
import { capReason } from './task-caps';
import { DELETE_COPY } from './tasks.copy';

type Props = { cap: CapValue | undefined; onDelete: () => void };

export function TaskDeleteItem({ cap, onDelete }: Props) {
  return (
    <Menu.Item
      color="danger"
      leftSection={<FiTrash2 size="1.25em" aria-hidden />}
      disabled={cap !== true}
      onClick={onDelete}
    >
      <Stack gap={4}>
        <Text inherit>{DELETE_COPY.menuItem}</Text>
        <Text size="xs" c="dimmed">
          {capReason(cap) ?? DELETE_COPY.hint}
        </Text>
      </Stack>
    </Menu.Item>
  );
}
