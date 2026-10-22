import { ActionIcon, Menu } from '@mantine/core';
import {
  FiCheck,
  FiEye,
  FiLogIn,
  FiMoreVertical,
  FiShield,
  FiSlash,
  FiTrash2,
  FiUserCheck,
  FiX,
} from 'react-icons/fi';
import { type AdminUser, isBanActive, ROLE_LABEL } from '~/lib/admin-users-api';
import { hasAnyAction, type UserPermissions, userAccess } from './user-access';
import type { useUserActions } from './useUserActions';

type Props = {
  user: AdminUser;
  perms: UserPermissions;
  actions: ReturnType<typeof useUserActions>;
  onOpen: (u: AdminUser) => void;
};

/** Kebab menu with every permitted action for one user; a blocked account shows why instead. */
export function UserActionsMenu({ user, perms, actions, onOpen }: Props) {
  const can = userAccess(user, perms);
  const banned = isBanActive(user);
  const busy = actions.busyId === user.id;
  const anyAction = hasAnyAction(can);
  return (
    <Menu position="bottom-end" withArrow shadow="md" width={240}>
      {/* No Tooltip here: Menu.Target and Tooltip both clone the child, and the
          child's own onClick would override the menu toggle (button did nothing). */}
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          loading={busy}
          aria-label={`Aksi untuk ${user.name}`}
        >
          <FiMoreVertical size={14} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        <Menu.Item leftSection={<FiEye size={14} />} onClick={() => onOpen(user)}>
          Lihat detail
        </Menu.Item>
        {(can.approve || can.reject) && <Menu.Divider />}
        {can.approve && (
          <Menu.Item
            color="teal"
            leftSection={<FiCheck size={14} />}
            onClick={() => actions.approve(user, can.approveRoles)}
          >
            Setujui…
          </Menu.Item>
        )}
        {can.reject && (
          <Menu.Item
            color="red"
            leftSection={<FiX size={14} />}
            onClick={() => actions.reject(user)}
          >
            Tolak…
          </Menu.Item>
        )}
        {can.roles.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>Ubah peran</Menu.Label>
            {can.roles.map((r) => (
              <Menu.Item
                key={r}
                leftSection={<FiShield size={14} />}
                onClick={() => actions.changeRole(user, r)}
              >
                Jadikan {ROLE_LABEL[r] ?? r}
              </Menu.Item>
            ))}
          </>
        )}
        {(can.ban || can.impersonate || can.remove) && <Menu.Divider />}
        {can.impersonate && (
          <Menu.Item leftSection={<FiLogIn size={14} />} onClick={() => actions.impersonate(user)}>
            Masuk sebagai pengguna ini
          </Menu.Item>
        )}
        {can.ban &&
          (banned ? (
            <Menu.Item
              leftSection={<FiUserCheck size={14} />}
              onClick={() => actions.unbanConfirm(user)}
            >
              Buka blokir
            </Menu.Item>
          ) : (
            <Menu.Item
              color="orange"
              leftSection={<FiSlash size={14} />}
              onClick={() => actions.banWithForm(user)}
            >
              Blokir akun…
            </Menu.Item>
          ))}
        {can.remove && (
          <Menu.Item
            color="red"
            leftSection={<FiTrash2 size={14} />}
            onClick={() => actions.removeConfirm(user)}
          >
            Hapus permanen…
          </Menu.Item>
        )}
        {/* Reason as plain text, never a tooltip: it must be readable on touch screens. */}
        {!anyAction && can.blockedReason && (
          <Menu.Label style={{ whiteSpace: 'normal' }}>{can.blockedReason}</Menu.Label>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
