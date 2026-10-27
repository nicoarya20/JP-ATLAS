/** Filters + paginated table + detail drawer for /dashboard/projects (P11 AD-12). */
import { Alert, Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import {
  ADMIN_PROJECTS_LIMIT,
  type AdminProjectFilters,
  type AdminProjectsParams,
  type AdminProjectsResponse,
  adminProjectKeys,
  DEFAULT_ADMIN_PROJECT_FILTERS,
  fetchAdminProjects,
  hasActiveAdminProjectFilters,
  type ProjectListItem,
} from '~/lib/admin-projects-api';
import { PROJECT_STATUSES } from '@server/pm/enums';
import { AdminProjectsTable } from './AdminProjectsTable';
import { ADMIN_PROJECTS_COPY, SORT_OPTIONS } from './projects.copy';
import { ProjectDrawer } from './ProjectDrawer';

type Props = {
  first: AdminProjectsResponse;
  loadedAt: number;
  /** AD-13 renders the "Ganti Pengelola" action; given the open project and a refetch callback. */
  renderManagerAction?: (item: ProjectListItem, onDone: () => void) => React.ReactNode;
};

const STATUS_OPTIONS = [
  { value: 'all', label: ADMIN_PROJECTS_COPY.statusAll },
  ...PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s].label })),
];

const paramsOf = (f: AdminProjectFilters, page: number): AdminProjectsParams => ({
  ...f,
  page,
  limit: ADMIN_PROJECTS_LIMIT,
});

export function AdminProjectsView({ first, loadedAt, renderManagerAction }: Props) {
  const [filters, setFilters] = useState<AdminProjectFilters>(DEFAULT_ADMIN_PROJECT_FILTERS);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ProjectListItem | null>(null);
  const params = paramsOf(filters, page);

  // The SSR page only seeds the exact query the loader ran (defaults, page 1).
  const seeded = JSON.stringify(params) === JSON.stringify(paramsOf(DEFAULT_ADMIN_PROJECT_FILTERS, 1));
  const query = useQuery({
    queryKey: adminProjectKeys.list(params),
    queryFn: () => fetchAdminProjects(params),
    initialData: seeded ? first : undefined,
    initialDataUpdatedAt: seeded ? loadedAt : undefined,
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PROJECTS_LIMIT));
  const items = data?.items ?? [];

  const patch = (next: Partial<AdminProjectFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPage(1);
  };
  const reset = () => {
    setFilters(DEFAULT_ADMIN_PROJECT_FILTERS);
    setPage(1);
  };

  return (
    <Stack gap="md">
      <Group gap="sm" wrap="wrap">
        <TextInput
          value={filters.q}
          onChange={(e) => patch({ q: e.currentTarget.value })}
          placeholder={ADMIN_PROJECTS_COPY.searchPlaceholder}
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          flex="1 1 220px"
          aria-label={ADMIN_PROJECTS_COPY.searchPlaceholder}
        />
        <Select
          value={filters.status}
          onChange={(v) => patch({ status: (v ?? 'all') as AdminProjectFilters['status'] })}
          data={STATUS_OPTIONS}
          aria-label={ADMIN_PROJECTS_COPY.colStatus}
        />
        <Select
          value={filters.sort}
          onChange={(v) => patch({ sort: (v ?? 'recent') as AdminProjectFilters['sort'] })}
          data={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          aria-label={ADMIN_PROJECTS_COPY.sortLabel}
        />
      </Group>

      {query.isError && (
        <Alert color="red" variant="light" icon={<FiAlertCircle size="1.25em" aria-hidden />}>
          {query.error instanceof Error ? query.error.message : ADMIN_PROJECTS_COPY.loadFailed}
        </Alert>
      )}

      <AdminProjectsTable
        items={items}
        onOpen={setOpen}
        filtered={hasActiveAdminProjectFilters(filters)}
        onResetFilters={reset}
      />

      {total > 0 && (
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm" c="dimmed">
            {ADMIN_PROJECTS_COPY.totalInfo(total)} · {ADMIN_PROJECTS_COPY.pageInfo(page, pages)}
          </Text>
          <Group gap="xs">
            <Button
              variant="default"
              size="sm"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {ADMIN_PROJECTS_COPY.prev}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={page >= pages || query.isFetching}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              {ADMIN_PROJECTS_COPY.next}
            </Button>
          </Group>
        </Group>
      )}

      <ProjectDrawer
        item={open}
        onClose={() => setOpen(null)}
        footer={open && renderManagerAction ? renderManagerAction(open, () => query.refetch()) : null}
      />
    </Stack>
  );
}
