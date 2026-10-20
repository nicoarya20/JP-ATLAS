/** The "Cuti" card of Pengaturan > Ketersediaan: the four states of `GET /leave/me` plus a short history. */
import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import type { LeaveApprovers, LeaveMeDto } from '~/lib/leave-api';
import { historyLine, leaveCardView } from '~/lib/leave-view';
import { LEAVE_COPY } from './leave.copy';

type Props = {
  me: LeaveMeDto;
  approvers: LeaveApprovers;
  today: string;
  /** True while the cancel call is in flight; the button spins and nothing can be sent twice. */
  busy: boolean;
  onRequest: () => void;
  onCancel: () => void;
};

export function LeaveCard({ me, approvers, today, busy, onRequest, onCancel }: Props) {
  const view = leaveCardView(me, approvers, today);
  const { action } = view;
  // The request on the card is not repeated below it.
  const past = me.history.filter((r) => r.id !== me.request?.id);
  return (
    <Stack gap="xs">
      <Paper withBorder radius="md" p={{ base: 'md', md: 'lg' }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={4} style={{ minWidth: 0, flex: '1 1 14em' }}>
            <Group gap="xs" wrap="wrap">
              <Text fw={700}>{view.title}</Text>
              {view.badge && (
                <Badge color={view.badge.color} variant="light">
                  {view.badge.label}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {view.detail}
            </Text>
          </Stack>
          {action && (
            <Button
              variant={action.kind === 'request' ? 'default' : 'outline'}
              loading={action.kind === 'cancel' && busy}
              onClick={action.kind === 'request' ? onRequest : onCancel}
              style={{ flexShrink: 0 }}
            >
              {action.label}
            </Button>
          )}
        </Group>
      </Paper>
      {past.length > 0 && (
        <Stack gap={2} component="section" aria-label={LEAVE_COPY.historyTitle}>
          <Text size="sm" fw={600}>
            {LEAVE_COPY.historyTitle}
          </Text>
          {past.map((r) => (
            <Text key={r.id} size="sm" c="dimmed">
              {historyLine(r)}
            </Text>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
