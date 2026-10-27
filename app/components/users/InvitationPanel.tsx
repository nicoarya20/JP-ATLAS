import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { DENY_UI } from '@server/access/decision';
import { canInviteWithRole } from '@server/access/user.policy';
import { normalizeRole, ROLES } from '@server/permissions';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertCircle, FiMail, FiXCircle } from 'react-icons/fi';
import { ROLE_LABEL } from '~/lib/admin-users-api';
import {
  type AdminInvitation,
  fetchInvitations,
  INVITATION_STATE_COLOR,
  INVITATION_STATE_LABEL,
  type InvitationFilter,
  type InvitationListResponse,
  invitationState,
} from '~/lib/invitations-api';
import { useTimeFormat } from '~/lib/time-format';
import { InviteForm } from './InviteForm';
import { useInvitationActions } from './useInvitationActions';
import { principalOf, type UserPermissions } from './user-access';

export const INVITATION_LIMIT = 20;
const FILTERS: Array<{ value: InvitationFilter; label: string }> = [
  { value: 'all', label: 'Semua undangan' },
  ...(['active', 'used', 'expired', 'revoked'] as const).map((value) => ({
    value,
    label: INVITATION_STATE_LABEL[value],
  })),
];
const SKELETON_KEYS = ['s0', 's1', 's2'];

type RowProps = {
  inv: AdminInvitation;
  now: number;
  perms: UserPermissions;
  actions: ReturnType<typeof useInvitationActions>;
};

/** One-line "what happened and when" under the status, in everyday words. */
function useWhen() {
  const { dateTime } = useTimeFormat();
  return (inv: AdminInvitation, now: number) => {
    const state = invitationState(inv, now);
    if (state === 'used' && inv.acceptedAt) return `Dipakai ${dateTime(inv.acceptedAt)}`;
    if (state === 'revoked' && inv.revokedAt) return `Dicabut ${dateTime(inv.revokedAt)}`;
    if (state === 'expired') return `Kedaluwarsa ${dateTime(inv.expiresAt)}`;
    return `Berlaku sampai ${dateTime(inv.expiresAt)}`;
  };
}

/** Revoke button for an open invitation; says why instead when this actor could not revoke it. */
function RevokeControl({ inv, now, perms, actions }: RowProps) {
  if (invitationState(inv, now) !== 'active') return null;
  const decision = canInviteWithRole(principalOf(perms), normalizeRole(inv.role));
  const reason = decision.ok
    ? null
    : normalizeRole(inv.role) === ROLES.ADMIN
      ? 'Hanya super-admin yang dapat mencabut undangan Admin.'
      : DENY_UI[decision.code].message;
  return (
    <Stack gap={4} align="flex-start">
      <Button
        size="xs"
        variant="light"
        color="red"
        leftSection={<FiXCircle size={14} />}
        loading={actions.busyId === inv.id}
        disabled={reason !== null}
        onClick={() => actions.revoke(inv)}
      >
        Cabut
      </Button>
      {reason && (
        <Text size="xs" c="dimmed">
          {reason}
        </Text>
      )}
    </Stack>
  );
}

function StateBadge({ inv, now }: { inv: AdminInvitation; now: number }) {
  const state = invitationState(inv, now);
  return (
    <Badge variant="light" color={INVITATION_STATE_COLOR[state]} size="sm" flex="0 0 auto">
      {INVITATION_STATE_LABEL[state]}
    </Badge>
  );
}

function InvitationRows(props: Omit<RowProps, 'inv'> & { rows: AdminInvitation[] }) {
  const { rows, ...rest } = props;
  const when = useWhen();
  return (
    <>
      <Paper
        withBorder
        visibleFrom="sm"
        // No `overflow` style prop in Mantine; it clips the table's corners to the card radius.
        style={{ overflow: 'hidden' }}
      >
        {/* Nor an `overflowX` one: five columns scroll sideways instead of widening the page. */}
        <Box style={{ overflowX: 'auto' }}>
          <Table highlightOnHover verticalSpacing="xs" fz="sm" miw={640}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Peran</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th visibleFrom="md">Dibuat oleh</Table.Th>
                <Table.Th w={150}>Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((inv) => (
                <Table.Tr key={inv.id}>
                  {/* An address has no spaces to wrap at, and Mantine has no `wordBreak` prop;
                      forcing the break keeps the column narrow instead of stretching the table. */}
                  <Table.Td style={{ wordBreak: 'break-all' }}>{inv.email}</Table.Td>
                  <Table.Td>{ROLE_LABEL[normalizeRole(inv.role)] ?? inv.role}</Table.Td>
                  <Table.Td>
                    <Stack gap={4} align="flex-start">
                      <StateBadge inv={inv} now={rest.now} />
                      <Text size="xs" c="dimmed">
                        {when(inv, rest.now)}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td visibleFrom="md">{inv.invitedByName ?? '—'}</Table.Td>
                  <Table.Td>
                    <RevokeControl inv={inv} {...rest} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Paper>
      <Stack gap="xs" hiddenFrom="sm">
        {rows.map((inv) => (
          <Paper key={inv.id} withBorder p="sm">
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                {/* Truncated, not wrapped: every card in the list keeps the same height (K-5). */}
                <Text size="sm" fw={500} miw={0} truncate>
                  {inv.email}
                </Text>
                <StateBadge inv={inv} now={rest.now} />
              </Group>
              <Text size="xs" c="dimmed">
                {ROLE_LABEL[normalizeRole(inv.role)] ?? inv.role} · {when(inv, rest.now)}
                {inv.invitedByName ? ` · oleh ${inv.invitedByName}` : ''}
              </Text>
              <RevokeControl inv={inv} {...rest} />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}

type Props = { initial: InvitationListResponse; loadedAt: number; perms: UserPermissions };

/** "Undangan awal" tab: create an invitation, then follow it from active to used, expired or revoked. */
export function InvitationPanel({ initial, loadedAt, perms }: Props) {
  const actions = useInvitationActions();
  const [filter, setFilter] = useState<InvitationFilter>('all');
  const [page, setPage] = useState(1);
  const params = { status: filter, limit: INVITATION_LIMIT, offset: (page - 1) * INVITATION_LIMIT };
  const list = useQuery({
    queryKey: ['admin-invitations', params],
    queryFn: () => fetchInvitations(params),
    placeholderData: keepPreviousData,
    initialData: filter === 'all' && page === 1 ? initial : undefined,
    initialDataUpdatedAt: loadedAt,
  });
  const rows = list.data?.invitations ?? [];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / INVITATION_LIMIT));
  const now = Date.now();

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Text size="sm" c="dimmed" mb="sm">
          Undang orang yang sudah kamu kenal. Begitu mereka masuk dengan Google memakai email ini,
          akunnya langsung disetujui tanpa antre.
        </Text>
        <InviteForm perms={perms} loading={actions.creating} onSubmit={actions.create} />
      </Paper>

      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Text fw={600}>Daftar undangan</Text>
        <Select
          size="sm"
          w={{ base: '100%', sm: 200 }}
          value={filter}
          onChange={(v) => {
            setFilter((v as InvitationFilter) ?? 'all');
            setPage(1);
          }}
          data={FILTERS}
          allowDeselect={false}
          aria-label="Filter status undangan"
        />
      </Group>

      {list.isError && (
        <Alert color="red" icon={<FiAlertCircle size={16} />} title="Gagal memuat undangan">
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="sm">{(list.error as Error).message}</Text>
            <Button
              size="xs"
              variant="light"
              color="red"
              loading={list.isFetching}
              onClick={() => list.refetch()}
            >
              Coba lagi
            </Button>
          </Group>
        </Alert>
      )}
      {list.isPending && (
        <Stack gap="xs">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} h={56} radius="md" />
          ))}
        </Stack>
      )}
      {!list.isPending && rows.length === 0 && (
        <Paper withBorder>
          <Stack align="center" gap="xs" py="xl">
            <ThemeIcon variant="light" color="gray" size={48} radius="xl">
              <FiMail size={22} />
            </ThemeIcon>
            <Text fw={600}>
              {filter === 'all' ? 'Belum ada undangan' : 'Tidak ada undangan dengan status ini'}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={360}>
              {filter === 'all'
                ? 'Isi email di atas untuk membuat undangan pertama.'
                : 'Pilih status lain atau tampilkan semua undangan.'}
            </Text>
          </Stack>
        </Paper>
      )}
      {rows.length > 0 && <InvitationRows rows={rows} now={now} perms={perms} actions={actions} />}
      {totalPages > 1 && (
        <Group justify="flex-end">
          <Pagination value={page} total={totalPages} onChange={setPage} size="sm" siblings={1} />
        </Group>
      )}
    </Stack>
  );
}
