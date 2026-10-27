/**
 * Admin project list: a desktop table and a mobile card list of the same rows (6 columns, so the
 * table alone is not enough on a 375px screen — CLAUDE.md mobile §2). A row opens the detail drawer.
 */
import { Box, Group, Paper, Stack, Table, Text } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import type { ProjectListItem } from '@server/project/project.dto';
import { FiFolder } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { ConditionBadge, PriorityBadge, StatusBadge } from './ProjectBadges';
import { ADMIN_PROJECTS_COPY } from './projects.copy';

type Props = {
  items: ProjectListItem[];
  onOpen: (item: ProjectListItem) => void;
  /** True when the empty list is the result of a filter, not an empty organization. */
  filtered: boolean;
  onResetFilters: () => void;
};

/** `YYYY-MM-DD` → "5 Januari 2026"; the dash when there is no deadline. */
function dueLabel(dueDate: string | null): string {
  if (!dueDate) return ADMIN_PROJECTS_COPY.noDue;
  return dayjs(dueDate).locale('id').format('D MMMM YYYY');
}

function progressLabel(p: ProjectListItem['progress']): string {
  const percent = p.percent === null ? '—' : `${p.percent}%`;
  return `${p.done}/${p.total} · ${percent}`;
}

export function AdminProjectsTable({ items, onOpen, filtered, onResetFilters }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FiFolder}
        title={ADMIN_PROJECTS_COPY.emptyTitle}
        description={ADMIN_PROJECTS_COPY.emptyDescription}
        filtered={filtered}
        onReset={onResetFilters}
      />
    );
  }

  return (
    <>
      {/* Desktop: full table. Mantine has no `overflow` prop, so the scroll wrapper stays a style. */}
      <Box style={{ overflowX: 'auto' }} visibleFrom="sm">
        <Table highlightOnHover striped="odd">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{ADMIN_PROJECTS_COPY.colName}</Table.Th>
              <Table.Th>{ADMIN_PROJECTS_COPY.colStatus}</Table.Th>
              <Table.Th>{ADMIN_PROJECTS_COPY.colManager}</Table.Th>
              <Table.Th>{ADMIN_PROJECTS_COPY.colCondition}</Table.Th>
              <Table.Th>{ADMIN_PROJECTS_COPY.colProgress}</Table.Th>
              <Table.Th>{ADMIN_PROJECTS_COPY.colDue}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr
                key={item.id}
                onClick={() => onOpen(item)}
                // A whole-row click opens the drawer; no Mantine prop for cursor.
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={600} truncate>
                      {item.name}
                    </Text>
                    <PriorityBadge priority={item.priority} />
                  </Group>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={item.status} />
                </Table.Td>
                <Table.Td>
                  {item.lead ? (
                    <Text size="sm">{item.lead.name}</Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      {ADMIN_PROJECTS_COPY.noManager}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <ConditionBadge condition={item.condition} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{progressLabel(item.progress)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{dueLabel(item.dueDate)}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Mobile: one card per project, every field visible without a sideways scroll. */}
      <Stack gap="xs" hiddenFrom="sm">
        {items.map((item) => (
          <Paper
            key={item.id}
            withBorder
            p="sm"
            onClick={() => onOpen(item)}
            // Tapping the card opens the drawer; no Mantine prop for cursor.
            style={{ cursor: 'pointer' }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                <Text fw={600} truncate miw={0}>
                  {item.name}
                </Text>
                <StatusBadge status={item.status} />
              </Group>
              <Group gap="xs" wrap="wrap">
                <PriorityBadge priority={item.priority} />
                <ConditionBadge condition={item.condition} />
              </Group>
              <Text size="sm">
                {ADMIN_PROJECTS_COPY.colManager}:{' '}
                {item.lead ? item.lead.name : ADMIN_PROJECTS_COPY.noManager}
              </Text>
              <Group justify="space-between" gap="xs">
                <Text size="xs" c="dimmed">
                  {progressLabel(item.progress)}
                </Text>
                <Text size="xs" c="dimmed">
                  {dueLabel(item.dueDate)}
                </Text>
              </Group>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
