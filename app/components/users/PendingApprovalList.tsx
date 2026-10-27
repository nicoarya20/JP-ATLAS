import {
  Alert,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiX } from 'react-icons/fi';
import {
  type AdminUser,
  fetchUsers,
  PENDING_LIMIT,
  PENDING_PARAMS,
  type UserListResponse,
} from '~/lib/admin-users-api';
import { useTimeFormat } from '~/lib/time-format';
import { IdentityCell } from './UserCells';
import { type UserPermissions, userAccess } from './user-access';
import type { useUserActions } from './useUserActions';

type Props = {
  initial: UserListResponse;
  loadedAt: number;
  perms: UserPermissions;
  actions: ReturnType<typeof useUserActions>;
};

const SKELETON_KEYS = ['s0', 's1', 's2'];
const nf = new Intl.NumberFormat('id-ID');

function EmptyQueue() {
  return (
    <Stack align="center" gap="xs" py="xl">
      <ThemeIcon variant="light" color="teal" size={48} radius="xl">
        <FiCheckCircle size={22} />
      </ThemeIcon>
      <Text fw={600}>Tidak ada yang menunggu persetujuan</Text>
      <Text size="sm" c="dimmed" ta="center" maw={380}>
        Orang yang baru mendaftar akan muncul di sini. Untuk orang yang sudah kamu kenal, buat
        undangan di tab Undangan supaya mereka langsung disetujui.
      </Text>
    </Stack>
  );
}

function PendingRow({
  user,
  perms,
  actions,
}: {
  user: AdminUser;
  perms: UserPermissions;
  actions: Props['actions'];
}) {
  const { dateTime, relative } = useTimeFormat();
  const can = userAccess(user, perms);
  const busy = actions.busyId === user.id;
  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Stack gap={4} miw={0} flex="1 1 240px">
          <IdentityCell user={user} isSelf={user.id === perms.currentUserId} />
          <Tooltip label={dateTime(user.createdAt)} withArrow openDelay={300}>
            <Text size="xs" c="dimmed">
              Mendaftar {relative(user.createdAt)}
            </Text>
          </Tooltip>
        </Stack>
        <Group gap="xs" wrap="wrap">
          <Button
            size="sm"
            color="teal"
            leftSection={<FiCheck size={14} />}
            loading={busy}
            disabled={!can.approve}
            onClick={() => actions.approve(user, can.approveRoles)}
          >
            Setujui
          </Button>
          <Button
            size="sm"
            variant="light"
            color="red"
            leftSection={<FiX size={14} />}
            disabled={!can.reject || busy}
            onClick={() => actions.reject(user)}
          >
            Tolak
          </Button>
        </Group>
      </Group>
      {/* Plain text rather than a tooltip: disabled buttons do not receive hover or touch. */}
      {can.blockedReason && (
        <Text size="xs" c="dimmed" mt="xs">
          {can.blockedReason}
        </Text>
      )}
    </Paper>
  );
}

/** The approval queue: oldest sign-up first, each with Setujui (choose a role) and Tolak (reason required). */
export function PendingApprovalList({ initial, loadedAt, perms, actions }: Props) {
  const list = useQuery({
    queryKey: ['admin-users', PENDING_PARAMS],
    queryFn: () => fetchUsers(PENDING_PARAMS),
    placeholderData: keepPreviousData,
    initialData: initial,
    initialDataUpdatedAt: loadedAt,
  });
  if (list.isError)
    return (
      <Alert
        color="red"
        icon={<FiAlertCircle size={16} />}
        title="Gagal memuat antrean persetujuan"
      >
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm">{(list.error as Error).message}</Text>
          <Button size="xs" variant="light" color="red" onClick={() => list.refetch()}>
            Coba lagi
          </Button>
        </Group>
      </Alert>
    );
  if (list.isPending)
    return (
      <Stack gap="xs">
        {SKELETON_KEYS.map((k) => (
          <Skeleton key={k} h={72} radius="md" />
        ))}
      </Stack>
    );
  const { users, total } = list.data;
  if (users.length === 0)
    return (
      <Paper withBorder>
        <EmptyQueue />
      </Paper>
    );
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {nf.format(total)} orang menunggu keputusan. Yang mendaftar paling dulu ada di atas.
      </Text>
      {users.map((u) => (
        <PendingRow key={u.id} user={u} perms={perms} actions={actions} />
      ))}
      {total > PENDING_LIMIT && (
        <Text size="xs" c="dimmed">
          Menampilkan {nf.format(PENDING_LIMIT)} pertama. Selesaikan dulu, sisanya akan muncul
          setelah ini.
        </Text>
      )}
    </Stack>
  );
}
