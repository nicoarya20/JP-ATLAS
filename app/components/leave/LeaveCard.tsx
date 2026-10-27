/**
 * The "Cuti" card of Pengaturan > Ketersediaan: read-only since P14. It says whether the person is
 * away and, either way, where leave is actually arranged — the button that used to be here is gone,
 * and a part that vanishes without a word reads as a broken app (P14 §8 R4).
 */
import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { formatLeaveDay } from '~/lib/leave-view';
import { LEAVE_COPY } from './leave.copy';

export function LeaveCard({ onLeaveUntil }: { onLeaveUntil: string | null }) {
  return (
    <Paper withBorder p={{ base: 'md', md: 'lg' }}>
      <Stack gap="xs">
        <Group gap="xs" wrap="wrap">
          <Text fw={700}>{LEAVE_COPY.cardTitle}</Text>
          {onLeaveUntil && (
            <Badge color="warn" variant="light">
              {LEAVE_COPY.onLeaveBadge}
            </Badge>
          )}
        </Group>
        <Text size="sm">
          {onLeaveUntil ? LEAVE_COPY.onLeave(formatLeaveDay(onLeaveUntil)) : LEAVE_COPY.here}
        </Text>
        <Text size="sm" c="dimmed">
          {LEAVE_COPY.whereToApply} {LEAVE_COPY.seenByTeam}
        </Text>
      </Stack>
    </Paper>
  );
}
