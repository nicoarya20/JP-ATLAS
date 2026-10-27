import { Alert, Box, Button, Group, Pagination, Paper, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { listAdminActivity } from '@server/api/admin-activity.query';
import { ADMIN_ACTIVITY_CATEGORIES } from '@server/audit.admin';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiActivity, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { ActivityDetailDrawer } from '~/components/admin/activity/ActivityDetailDrawer';
import { ActivityFilters } from '~/components/admin/activity/ActivityFilters';
import { ActivityCardList, ActivityTable } from '~/components/admin/activity/ActivityTable';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  type ActivityCategory,
  type AdminActivityListResponse,
  type AdminActivityRow,
  DEFAULT_ACTIVITY_FILTERS,
  type AdminActivityFilters as Filters,
  fetchAdminActivity,
  hasActiveActivityFilters,
} from '~/lib/admin-activity-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/activity';

export function meta() {
  return [{ title: 'Aktivitas — Simple PM' }];
}

const LIMIT = 25;
const nf = new Intl.NumberFormat('id-ID');

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const list = await listAdminActivity({ page: '1', limit: String(LIMIT) });
  // Only id + label cross to the client; the `actions` arrays stay on the server.
  const categories: ActivityCategory[] = ADMIN_ACTIVITY_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
  }));
  return { list: toJson<AdminActivityListResponse>(list), categories, loadedAt: Date.now() };
}

export default function ActivityPage({ loaderData }: Route.ComponentProps) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_ACTIVITY_FILTERS);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AdminActivityRow | null>(null);
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const params = { ...filters, search: debouncedSearch, page, limit: LIMIT };
  const filtered = hasActiveActivityFilters(filters);
  const list = useQuery({
    queryKey: ['admin-activity', params],
    queryFn: () => fetchAdminActivity(params),
    placeholderData: keepPreviousData,
    initialData: !filtered && page === 1 ? loaderData.list : undefined,
    initialDataUpdatedAt: loaderData.loadedAt,
  });
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const setFilters = (patch: Partial<Filters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const empty = (
    <EmptyState
      icon={FiActivity}
      title="Belum ada aktivitas"
      description="Persetujuan akun, perubahan peran, perubahan setelan, penghapusan proyek, dan ekspor data akan muncul di sini."
      filtered={filtered}
      onReset={() => setFilters(DEFAULT_ACTIVITY_FILTERS)}
    />
  );

  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <PageHeader
        title="Aktivitas"
        description="Siapa menyetujui akun, mengubah peran, mengubah setelan, menghapus proyek, atau mengekspor data — dalam bahasa yang terbaca. Hanya bisa dibaca."
        actions={
          <Button
            variant="light"
            leftSection={<FiRefreshCw size="1.25em" />}
            loading={list.isFetching}
            onClick={() => list.refetch()}
          >
            Muat ulang
          </Button>
        }
      />

      <ActivityFilters
        filters={filters}
        onChange={setFilters}
        categories={loaderData.categories}
        matchCount={list.data?.total}
      />

      {list.isError && (
        <Alert color="red" icon={<FiAlertCircle size="1.25em" />} title="Gagal memuat aktivitas">
          {(list.error as Error).message}
        </Alert>
      )}

      <Paper
        withBorder
        visibleFrom="sm"
        style={{
          // Mantine has no `overflow` prop: this clips the table to the card's rounded corners.
          overflow: 'hidden',
        }}
      >
        <ActivityTable
          rows={rows}
          loading={list.isPending}
          fetching={list.isFetching}
          onOpen={setDetail}
          empty={empty}
        />
      </Paper>
      <Box hiddenFrom="sm">
        <ActivityCardList rows={rows} loading={list.isPending} onOpen={setDetail} empty={empty} />
      </Box>

      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Text size="xs" c="dimmed">
          {total > 0
            ? `Menampilkan ${nf.format((page - 1) * LIMIT + 1)}–${nf.format(Math.min(page * LIMIT, total))} dari ${nf.format(total)}`
            : 'Tidak ada hasil'}
        </Text>
        {totalPages > 1 && (
          <Pagination value={page} total={totalPages} onChange={setPage} size="sm" siblings={1} />
        )}
      </Group>

      <ActivityDetailDrawer row={detail} onClose={() => setDetail(null)} />
    </Stack>
  );
}
