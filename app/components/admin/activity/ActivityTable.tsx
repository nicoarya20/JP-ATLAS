import {
  ActionIcon,
  Box,
  Group,
  LoadingOverlay,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { FiEye } from 'react-icons/fi';
import type { AdminActivityRow } from '~/lib/admin-activity-api';
import { TARGET_LABELS } from '~/lib/audit-api';
import { useTimeFormat } from '~/lib/time-format';
import { TimeCell } from '../../logs/LogCells';
import { TruncatedText } from '../../logs/TruncatedText';
import { ActionBadge, ActorCell } from './ActivityCells';

type Props = {
  rows: AdminActivityRow[];
  loading: boolean;
  fetching?: boolean;
  onOpen: (r: AdminActivityRow) => void;
  empty: React.ReactNode;
};
const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5'];
const COLUMNS = 5;

/** Desktop table (≥ sm). Four data columns, so a mobile card list stands in below sm. */
export function ActivityTable({ rows, loading, fetching = false, onOpen, empty }: Props) {
  return (
    <Box
      pos="relative"
      style={{
        // Mantine has no `overflowX` prop: the table scrolls sideways rather than widening the page
        // (CLAUDE.md mobile §2).
        overflowX: 'auto',
      }}
    >
      <LoadingOverlay visible={fetching && !loading} zIndex={5} overlayProps={{ blur: 1 }} />
      <Table highlightOnHover withTableBorder verticalSpacing="xs" fz="sm" miw={640}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Waktu</Table.Th>
            <Table.Th>Siapa</Table.Th>
            <Table.Th>Aksi</Table.Th>
            <Table.Th>Keterangan</Table.Th>
            <Table.Th w={44} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading &&
            SKELETON_KEYS.map((k) => (
              <Table.Tr key={k}>
                <Table.Td colSpan={COLUMNS}>
                  <Skeleton h={28} radius="sm" />
                </Table.Td>
              </Table.Tr>
            ))}
          {!loading &&
            rows.map((r) => (
              <Table.Tr
                key={r.id}
                onClick={() => onOpen(r)}
                style={{
                  // Mantine has no `cursor` prop; clicking the row opens the detail view.
                  cursor: 'pointer',
                }}
              >
                <Table.Td>
                  <TimeCell iso={r.createdAt} />
                </Table.Td>
                <Table.Td>
                  <ActorCell row={r} />
                </Table.Td>
                <Table.Td>
                  <ActionBadge action={r.action} />
                </Table.Td>
                <Table.Td>
                  <TruncatedText size="sm" maw={420}>
                    {r.summary}
                  </TruncatedText>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Tooltip label="Detail" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => onOpen(r)}
                      aria-label="Lihat detail aktivitas"
                    >
                      <FiEye size="1.25em" />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          {!loading && rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={COLUMNS}>{empty}</Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

/** Mobile card list (< sm): every field is visible without a sideways scroll. */
export function ActivityCardList({ rows, loading, onOpen, empty }: Props) {
  const { relative: formatRelative } = useTimeFormat();
  if (loading) {
    return (
      <Stack gap="xs">
        {SKELETON_KEYS.slice(0, 4).map((k) => (
          <Skeleton key={k} h={96} radius="md" />
        ))}
      </Stack>
    );
  }
  if (rows.length === 0) return <Paper withBorder>{empty}</Paper>;
  return (
    <Stack gap="xs">
      {rows.map((r) => (
        <Paper
          key={r.id}
          withBorder
          p="sm"
          radius="md"
          onClick={() => onOpen(r)}
          style={{
            // Mantine has no `cursor` prop; tapping the card opens the detail view.
            cursor: 'pointer',
          }}
        >
          <Stack gap={4}>
            <Group gap="xs" wrap="nowrap" justify="space-between">
              <ActionBadge action={r.action} size="xs" />
              <Text size="xs" c="dimmed" flex="0 0 auto">
                {formatRelative(r.createdAt)}
              </Text>
            </Group>
            <Text size="sm">{r.summary}</Text>
            <Group gap="xs" wrap="nowrap" justify="space-between">
              <ActorCell row={r} />
              <Text size="xs" c="dimmed" flex="0 0 auto">
                {TARGET_LABELS[r.targetType] ?? r.targetType}
              </Text>
            </Group>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
