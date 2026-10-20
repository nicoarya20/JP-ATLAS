/**
 * "Persetujuan cuti": the pending requests this person may decide.
 * SEMENTARA: the Inbox page still shows sample data (H-D2), so approvers decide here. Delete this
 * section, `LeaveRejectModal` and the `pending` part of the loader once the Inbox leave card is live.
 */
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { FiCheckCircle } from 'react-icons/fi';
import type { LeavePendingDto, LeavePendingPage } from '~/lib/leave-api';
import { dueTasksLabel, formatLeaveRange, leaveDaysLabel } from '~/lib/leave-view';
import { LEAVE_APPROVAL_COPY } from './leave.copy';

type Props = {
  page: LeavePendingPage;
  /** Id of the request being approved right now; its button spins. */
  approvingId: string | null;
  onApprove: (item: LeavePendingDto) => void;
  onReject: (item: LeavePendingDto) => void;
};

export function LeaveApprovalList({ page, approvingId, onApprove, onReject }: Props) {
  if (page.items.length === 0) {
    return (
      <Paper withBorder radius="md" p={{ base: 'md', md: 'lg' }}>
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <FiCheckCircle size="1.25em" aria-hidden />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={700}>{LEAVE_APPROVAL_COPY.empty}</Text>
            <Text size="sm" c="dimmed">
              {LEAVE_APPROVAL_COPY.emptyHint}
            </Text>
          </Stack>
        </Group>
      </Paper>
    );
  }
  return (
    <Stack gap="xs">
      {page.items.map((item) => (
        <Paper key={item.id} withBorder radius="md" p={{ base: 'md', md: 'lg' }}>
          <Stack gap="sm">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={700}>{item.requester.name}</Text>
              <Text size="sm">{`${formatLeaveRange(item.startDate, item.endDate)} · ${leaveDaysLabel(item.days)}`}</Text>
              <Text size="sm" c={item.dueTasks > 0 ? undefined : 'dimmed'}>
                {dueTasksLabel(item.dueTasks)}
              </Text>
              {item.note && (
                <Text size="sm" c="dimmed">
                  {`${LEAVE_APPROVAL_COPY.note}: ${item.note}`}
                </Text>
              )}
            </Stack>
            <Group gap="xs" wrap="wrap">
              <Button loading={approvingId === item.id} onClick={() => onApprove(item)}>
                {LEAVE_APPROVAL_COPY.approve}
              </Button>
              <Button
                variant="default"
                disabled={approvingId === item.id}
                onClick={() => onReject(item)}
              >
                {LEAVE_APPROVAL_COPY.reject}
              </Button>
            </Group>
          </Stack>
        </Paper>
      ))}
      {page.total > page.items.length && (
        <Text size="sm" c="dimmed">
          {LEAVE_APPROVAL_COPY.more(page.items.length, page.total)}
        </Text>
      )}
    </Stack>
  );
}
