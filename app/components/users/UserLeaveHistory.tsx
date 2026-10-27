/**
 * The recorded leave periods of one person (P14 CU-04, §10 T1). Without this list a period that is
 * entirely past can be read nowhere: the Team badge is computed from today, so it only ever shows
 * the leave under way. Desktop table and mobile cards, the pattern of `/dashboard/users`.
 *
 * The note is rendered here and only here (P14 D6). Everything the rows show arrives from the
 * server, including `today`, so a past range is told from a future one without the browser clock.
 */
import { Badge, Box, Group, Paper, Stack, Table, Text } from '@mantine/core';
import type { AdminLeaveEntry } from '~/lib/admin-leave-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { useTimeFormat } from '~/lib/time-format';
import { TruncatedText } from '../logs/TruncatedText';
import { USER_LEAVE_COPY as COPY } from './user-leave.copy';

type Props = { items: AdminLeaveEntry[]; today: string };

/** Where the range sits relative to today; the badge keeps a future period from reading as current. */
export type LeavePhase = 'running' | 'upcoming' | 'past';

export function leavePhaseOf(entry: AdminLeaveEntry, today: string): LeavePhase {
  if (entry.startDate > today) return 'upcoming';
  if (entry.endDate < today) return 'past';
  return 'running';
}

const PHASE_LABEL: Record<LeavePhase, string> = {
  running: COPY.running,
  upcoming: COPY.upcoming,
  past: COPY.past,
};
const PHASE_COLOR: Record<LeavePhase, string> = {
  running: 'warn',
  upcoming: 'atlas',
  past: 'gray',
};

function PhaseBadge({ phase }: { phase: LeavePhase }) {
  return (
    <Badge size="xs" variant="light" color={PHASE_COLOR[phase]}>
      {PHASE_LABEL[phase]}
    </Badge>
  );
}

/** "Dicatat oleh Ayu", or that the account behind `created_by` is gone. */
const recordedByText = (entry: AdminLeaveEntry) =>
  entry.recordedBy?.name
    ? COPY.recordedBy(entry.recordedBy.name)
    : entry.recordedBy
      ? COPY.recordedBy(entry.recordedBy.id)
      : COPY.recordedByUnknown;

export function UserLeaveHistory({ items, today }: Props) {
  const { dateTime: formatDateTime } = useTimeFormat();
  return (
    <>
      {/* Scroll wrapper: four columns in a side drawer do not always fit. */}
      <Box style={{ overflowX: 'auto' }} visibleFrom="sm">
        <Table verticalSpacing="xs" fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{COPY.colPeriod}</Table.Th>
              <Table.Th>{COPY.colDays}</Table.Th>
              <Table.Th>{COPY.colNote}</Table.Th>
              <Table.Th>{COPY.colRecordedBy}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm">{formatLeaveRange(entry.startDate, entry.endDate)}</Text>
                    <PhaseBadge phase={leavePhaseOf(entry, today)} />
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{COPY.days(entry.days)}</Text>
                </Table.Td>
                <Table.Td>
                  {entry.note ? (
                    <TruncatedText size="sm">{entry.note}</TruncatedText>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {recordedByText(entry)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDateTime(entry.recordedAt)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Mobile: every field visible without a horizontal scroll. */}
      <Stack gap="xs" hiddenFrom="sm">
        {items.map((entry) => (
          <Paper key={entry.id} withBorder p="sm">
            <Stack gap={4} miw={0}>
              <Group gap="xs" wrap="wrap">
                <Text size="sm" fw={500}>
                  {formatLeaveRange(entry.startDate, entry.endDate)}
                </Text>
                <PhaseBadge phase={leavePhaseOf(entry, today)} />
                <Text size="xs" c="dimmed">
                  {COPY.days(entry.days)}
                </Text>
              </Group>
              {entry.note && <Text size="sm">{entry.note}</Text>}
              <Text size="xs" c="dimmed">
                {`${recordedByText(entry)} · ${formatDateTime(entry.recordedAt)}`}
              </Text>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
