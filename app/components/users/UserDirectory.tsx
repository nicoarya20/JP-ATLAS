import { Alert, Box, Button, Group, Pagination, Paper, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { VisitEmptyState } from '~/components/visits/VisitEmptyState';
import {
  type AdminUser,
  DEFAULT_USER_FILTERS,
  type UserFilters as Filters,
  fetchUserStats,
  fetchUsers,
  hasActiveUserFilters,
  type UserListResponse,
  type UserStats,
} from '~/lib/admin-users-api';
import { UserCardList } from './UserCardList';
import { UserDetailDrawer } from './UserDetailDrawer';
import { UserFilters } from './UserFilters';
import { UserStatsCards } from './UserStatsCards';
import { UserTable } from './UserTable';
import type { UserPermissions } from './user-access';
import { useUserActions } from './useUserActions';

const LIMIT = 25;
const nf = new Intl.NumberFormat('id-ID');

export type UserDirectoryInitial = { list: UserListResponse; stats: UserStats; loadedAt: number };

/** The searchable user directory (stats, filters, table/cards, detail drawer) shared by /dashboard/users and /dev/users. */
export function UserDirectory({
  initial,
  perms,
}: {
  initial: UserDirectoryInitial;
  perms: UserPermissions;
}) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_USER_FILTERS);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const params = { ...filters, search: debouncedSearch, page, limit: LIMIT };
  const filtered = hasActiveUserFilters(filters);

  const list = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
    initialData: !filtered && page === 1 ? initial.list : undefined,
    initialDataUpdatedAt: initial.loadedAt,
  });
  const stats = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: fetchUserStats,
    initialData: initial.stats,
    initialDataUpdatedAt: initial.loadedAt,
  });
  const rows = list.data?.users ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  // Keep the drawer in sync after a mutation refetch.
  const detailRow = detail ? (rows.find((r) => r.id === detail.id) ?? detail) : null;

  const setFilters = (patch: Partial<Filters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const actions = useUserActions({ onDone: () => undefined });
  const empty = (
    <VisitEmptyState filtered={filtered} onReset={() => setFilters(DEFAULT_USER_FILTERS)} />
  );
  const listProps = { rows, loading: list.isPending, perms, actions, onOpen: setDetail, empty };

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button
          size="sm"
          variant="light"
          leftSection={<FiRefreshCw size={14} />}
          loading={list.isFetching}
          onClick={() => {
            list.refetch();
            stats.refetch();
          }}
        >
          Muat ulang
        </Button>
      </Group>

      <UserStatsCards stats={stats.data} />
      <UserFilters filters={filters} onChange={setFilters} matchCount={list.data?.total} />

      {list.isError && (
        <Alert color="red" icon={<FiAlertCircle size={16} />} title="Gagal memuat daftar pengguna">
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

      <Paper
        withBorder
        visibleFrom="sm"
        // No `overflow` style prop in Mantine; it clips the table's corners to the card radius.
        style={{ overflow: 'hidden' }}
      >
        <UserTable {...listProps} fetching={list.isFetching} />
      </Paper>
      <Box hiddenFrom="sm">
        <UserCardList {...listProps} />
      </Box>

      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Text size="xs" c="dimmed">
          {total > 0
            ? `Menampilkan ${nf.format((page - 1) * LIMIT + 1)}–${nf.format(Math.min(page * LIMIT, total))} dari ${nf.format(total)} pengguna`
            : 'Tidak ada hasil'}
        </Text>
        {totalPages > 1 && (
          <Pagination value={page} total={totalPages} onChange={setPage} size="sm" siblings={1} />
        )}
      </Group>

      <UserDetailDrawer
        user={detailRow}
        onClose={() => setDetail(null)}
        perms={perms}
        actions={actions}
      />
    </Stack>
  );
}
