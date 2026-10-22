import { Alert, Avatar, Badge, Button, Divider, Drawer, Group, Stack, Text } from '@mantine/core';
import {
  FiCheck,
  FiClock,
  FiLogIn,
  FiShield,
  FiSlash,
  FiTrash2,
  FiUserCheck,
  FiX,
} from 'react-icons/fi';
import { type AdminUser, isBanActive, ROLE_LABEL } from '~/lib/admin-users-api';
import { useTimeFormat } from '~/lib/time-format';
import { Copyable, Field, Section } from '../logs/DetailParts';
import { RoleBadge, StatusBadge } from './UserCells';
import { hasAnyAction, type UserPermissions, userAccess } from './user-access';
import type { useUserActions } from './useUserActions';

type Props = {
  user: AdminUser | null;
  onClose: () => void;
  perms: UserPermissions;
  actions: ReturnType<typeof useUserActions>;
};

const nf = new Intl.NumberFormat('id-ID');

/** Full profile + permitted actions for one user. */
export function UserDetailDrawer({ user, onClose, perms, actions }: Props) {
  const { dateTime: formatDateTime, relative: formatRelative } = useTimeFormat();
  const can = user ? userAccess(user, perms) : null;
  const busy = user ? actions.busyId === user.id : false;
  const banned = user ? isBanActive(user) : false;
  return (
    <Drawer
      opened={user !== null}
      onClose={onClose}
      position="right"
      size="md"
      title="Detail pengguna"
      padding="md"
    >
      {user && can && (
        <Stack gap="lg">
          <Group wrap="nowrap" align="flex-start">
            <Avatar
              src={user.image}
              radius="xl"
              size={56}
              name={user.name}
              color="initials"
              imageProps={{ referrerPolicy: 'no-referrer' }}
            />
            <Stack gap={4} style={{ minWidth: 0 }}>
              <Text fw={600} size="lg" lh={1.2} style={{ wordBreak: 'break-word' }}>
                {user.name}
              </Text>
              <Text size="sm" c="dimmed" style={{ wordBreak: 'break-all' }}>
                {user.email}
              </Text>
              <Group gap="xs">
                <RoleBadge role={user.role} />
                <StatusBadge user={user} />
                <Badge
                  size="sm"
                  variant={user.emailVerified ? 'light' : 'outline'}
                  color={user.emailVerified ? 'teal' : 'gray'}
                >
                  {user.emailVerified ? 'Email terverifikasi' : 'Email belum diverifikasi'}
                </Badge>
              </Group>
            </Stack>
          </Group>

          {banned && (
            <Alert
              color="red"
              variant="light"
              icon={<FiSlash size={16} />}
              title="Akun ini diblokir"
            >
              {user.banReason ? `Alasan: ${user.banReason}. ` : 'Tanpa alasan tercatat. '}
              {user.banExpires
                ? `Berakhir ${formatDateTime(user.banExpires)}.`
                : 'Permanen sampai dibuka manual.'}
            </Alert>
          )}
          {user.approvalStatus === 'pending' && (
            <Alert
              color="yellow"
              variant="light"
              icon={<FiClock size={16} />}
              title="Menunggu persetujuan"
            >
              Orang ini belum bisa memakai aplikasi sampai kamu menyetujuinya.
            </Alert>
          )}
          {user.approvalStatus === 'rejected' && (
            <Alert
              color="orange"
              variant="light"
              icon={<FiX size={16} />}
              title="Pendaftaran ditolak"
            >
              {user.approvalReason ? `Alasan: ${user.approvalReason}` : 'Tanpa alasan tercatat.'}
            </Alert>
          )}

          <Section title="Aktivitas">
            <Field label="Masuk terakhir">
              <Text size="sm">
                {user.lastLoginAt
                  ? `${formatRelative(user.lastLoginAt)} · ${formatDateTime(user.lastLoginAt)}`
                  : 'Belum pernah'}
              </Text>
            </Field>
            <Field label="Jumlah masuk">
              <Text size="sm">{nf.format(user.loginCount)}</Text>
            </Field>
            <Field label="Sesi aktif">
              <Text size="sm">{nf.format(user.activeSessions)}</Text>
            </Field>
            <Field label="Bergabung">
              <Text size="sm">{formatDateTime(user.createdAt)}</Text>
            </Field>
          </Section>
          <Divider />

          <Section title="Akun">
            <Field label="User ID">
              <Copyable value={user.id} />
            </Field>
            <Field label="Provider">
              <Group gap={4} justify="flex-end">
                {user.providers.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                ) : (
                  user.providers.map((p) => (
                    <Badge
                      key={p}
                      size="sm"
                      variant="light"
                      color={p === 'credential' ? 'gray' : 'indigo'}
                    >
                      {p === 'credential' ? 'email & password' : p}
                    </Badge>
                  ))
                )}
              </Group>
            </Field>
          </Section>
          <Divider />

          <Section title="Aksi">
            {!hasAnyAction(can) ? (
              <Text size="sm" c="dimmed">
                {can.blockedReason ?? 'Tidak ada aksi yang tersedia untuk akun ini.'}
              </Text>
            ) : (
              <Stack gap="xs">
                {can.approve && (
                  <Button
                    variant="light"
                    color="teal"
                    leftSection={<FiCheck size={14} />}
                    loading={busy}
                    onClick={() => actions.approve(user, can.approveRoles)}
                  >
                    Setujui…
                  </Button>
                )}
                {can.reject && (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<FiX size={14} />}
                    loading={busy}
                    onClick={() => actions.reject(user)}
                  >
                    Tolak…
                  </Button>
                )}
                {can.roles.map((r) => (
                  <Button
                    key={r}
                    variant="light"
                    leftSection={<FiShield size={14} />}
                    loading={busy}
                    onClick={() => actions.changeRole(user, r)}
                  >
                    Jadikan {ROLE_LABEL[r] ?? r}
                  </Button>
                ))}
                {can.impersonate && (
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<FiLogIn size={14} />}
                    loading={busy}
                    onClick={() => actions.impersonate(user)}
                  >
                    Masuk sebagai pengguna ini
                  </Button>
                )}
                {can.ban &&
                  (banned ? (
                    <Button
                      variant="light"
                      color="teal"
                      leftSection={<FiUserCheck size={14} />}
                      loading={busy}
                      onClick={() => actions.unbanConfirm(user)}
                    >
                      Buka blokir
                    </Button>
                  ) : (
                    <Button
                      variant="light"
                      color="orange"
                      leftSection={<FiSlash size={14} />}
                      loading={busy}
                      onClick={() => actions.banWithForm(user)}
                    >
                      Blokir akun…
                    </Button>
                  ))}
                {can.remove && (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<FiTrash2 size={14} />}
                    loading={busy}
                    onClick={() => actions.removeConfirm(user)}
                  >
                    Hapus permanen…
                  </Button>
                )}
              </Stack>
            )}
          </Section>
        </Stack>
      )}
    </Drawer>
  );
}
