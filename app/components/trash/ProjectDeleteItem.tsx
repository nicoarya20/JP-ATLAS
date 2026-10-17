/** "Hapus proyek" in the project ⋯ menu (S1-18); rendered only when the server says `can.trash === true`. */
import { Menu } from '@mantine/core';
import type { CapValue } from '@server/access/capabilities';
import type { IsoDate } from '@server/metrics/types';
import { FiTrash2 } from 'react-icons/fi';
import { TRASH_CONFIRM_COPY } from './trash.copy';
import { type TrashTarget, useTrashActions } from './useTrashActions';

/**
 * Shown only when allowed: a Member-manager gets `ROLE_CANNOT_TRASH` and must not see the item at all
 * (15 Oct 2026 decision), so a disabled capability hides it too.
 */
export function showsDeleteProject(can: { trash?: CapValue }): boolean {
  return can.trash === true;
}

export function ProjectDeleteItem({ target, today }: { target: TrashTarget; today: IsoDate }) {
  const { remove } = useTrashActions();
  return (
    <Menu.Item
      color="danger"
      leftSection={<FiTrash2 size="1.25em" aria-hidden />}
      disabled={remove.loading}
      onClick={() => remove.confirm(target, today)}
    >
      {TRASH_CONFIRM_COPY.menuItem}
    </Menu.Item>
  );
}
