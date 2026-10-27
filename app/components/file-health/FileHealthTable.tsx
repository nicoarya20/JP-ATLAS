import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  type FileHealthRow,
  fmtNum,
  fmtTokens,
  HAZARD_META,
  KIND_LABELS,
  STATUS_META,
} from '~/lib/file-health-api';

type Props = { rows: FileHealthRow[]; loading: boolean; empty: React.ReactNode };

const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5'];

function StatusBadge({ row }: { row: FileHealthRow }) {
  const m = STATUS_META[row.status];
  return (
    <Tooltip
      label={
        row.hardLimitViolation
          ? 'Melanggar hard limit global (500 baris / 20.000 karakter)'
          : m.label
      }
      withArrow
    >
      <Badge color={m.color} variant={row.hardLimitViolation ? 'filled' : 'light'} size="sm">
        {row.hardLimitViolation ? 'Hard limit' : m.label}
      </Badge>
    </Tooltip>
  );
}

function HazardBadge({ row }: { row: FileHealthRow }) {
  const m = HAZARD_META[row.hazard];
  return (
    <Tooltip label={row.advice} withArrow multiline maw={300}>
      <Badge color={m.color} variant={row.hazard === 'none' ? 'outline' : 'light'} size="sm">
        {m.label}
      </Badge>
    </Tooltip>
  );
}

function LinesCell({ row }: { row: FileHealthRow }) {
  if (row.limit === null) {
    return (
      <Text size="sm" ff="monospace">
        {fmtNum(row.lines)}
      </Text>
    );
  }
  const pct = Math.min(100, Math.round((row.lines / row.limit) * 100));
  const color = row.status === 'over' ? 'red' : row.status === 'warn' ? 'yellow' : 'teal';
  return (
    <Stack gap={4} miw={120}>
      <Text size="sm" ff="monospace" lh={1.2}>
        {fmtNum(row.lines)}{' '}
        <Text span c="dimmed" size="xs">
          / {row.limit}
        </Text>
      </Text>
      <Progress value={pct} color={color} size="xs" radius="xl" />
    </Stack>
  );
}

/** Desktop table + mobile card list for the file list. */
export function FileHealthTable({ rows, loading, empty }: Props) {
  if (loading) {
    return (
      <Stack gap="xs">
        {SKELETON_KEYS.map((k) => (
          <Skeleton key={k} h={40} radius="sm" />
        ))}
      </Stack>
    );
  }
  if (rows.length === 0) return <Paper withBorder>{empty}</Paper>;

  return (
    <>
      <Paper
        withBorder
        visibleFrom="sm"
        style={{
          // Mantine has no `overflow` prop: this clips the table to the card's rounded corners.
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            // Mantine has no `overflowX` prop: the table scrolls sideways rather than widening the page
            // (CLAUDE.md mobile §2).
            overflowX: 'auto',
          }}
        >
          <Table highlightOnHover verticalSpacing="xs" fz="sm" miw={760}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>File</Table.Th>
                <Table.Th visibleFrom="md">Jenis</Table.Th>
                <Table.Th>Baris / limit</Table.Th>
                <Table.Th visibleFrom="lg">Karakter</Table.Th>
                <Table.Th>Token est.</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Konteks agent</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.path}>
                  <Table.Td>
                    <Text ff="monospace" size="sm" truncate maw={380} title={r.path}>
                      {r.path}
                    </Text>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="sm" c="dimmed">
                      {KIND_LABELS[r.kind]}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <LinesCell row={r} />
                  </Table.Td>
                  <Table.Td visibleFrom="lg">
                    <Text size="sm" ff="monospace" c={r.chars > 20_000 ? 'red' : undefined}>
                      {fmtNum(r.chars)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {fmtTokens(r.estTokens)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge row={r} />
                  </Table.Td>
                  <Table.Td>
                    <HazardBadge row={r} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Paper>

      <Stack gap="xs" hiddenFrom="sm">
        {rows.map((r) => (
          <Paper key={r.path} withBorder p="sm">
            <Stack gap="xs">
              {/* `lineClamp` keeps every card the same height (K-5); `title` still reveals the
                  whole path, and `wordBreak` lets a path with no separators break at all. */}
              <Text
                ff="monospace"
                size="sm"
                fw={500}
                lineClamp={2}
                title={r.path}
                style={{ wordBreak: 'break-all' }}
              >
                {r.path}
              </Text>
              <Group gap="xs" wrap="wrap">
                <StatusBadge row={r} />
                <HazardBadge row={r} />
                <Text size="xs" c="dimmed">
                  {KIND_LABELS[r.kind]}
                </Text>
              </Group>
              <LinesCell row={r} />
              <Text size="xs" c="dimmed">
                {fmtNum(r.chars)} karakter · ~{fmtTokens(r.estTokens)} token
              </Text>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
