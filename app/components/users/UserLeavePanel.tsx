/**
 * "Ketersediaan" in the user drawer (P14 CU-04): the period under way with its Admin-only note
 * (P14 D6 — this is the only screen that shows it), the two actions, and the recorded history
 * below it (§10 T1). Admin and Super-admin only; the endpoint refuses while impersonating, so the
 * panel says why instead of rendering a request that is certain to 403.
 */
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertCircle, FiCalendar, FiXCircle } from 'react-icons/fi';
import {
  type AdminLeavePeriod,
  type AdminLeaveRead,
  fetchUserLeave,
  userLeaveKey,
} from '~/lib/admin-leave-api';
import type { AdminUser } from '~/lib/admin-users-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { UserLeaveHistory } from './UserLeaveHistory';
import { USER_LEAVE_COPY as COPY } from './user-leave.copy';
import type { useUserActions } from './useUserActions';

type ViewProps = {
  data: AdminLeaveRead;
  /** True while the end-leave request is in flight for this person. */
  busy: boolean;
  page: number;
  onPage: (page: number) => void;
  onSet: () => void;
  onEnd: (running: AdminLeavePeriod) => void;
};

/** The panel without the request, so it renders the same in a test and in the drawer. */
export function UserLeaveView({ data, busy, page, onPage, onSet, onEnd }: ViewProps) {
  const { running, items, total, limit, today } = data;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <Stack gap="sm">
      <Paper withBorder p="sm">
        <Stack gap="xs">
          {running ? (
            <>
              <Group gap="xs" wrap="wrap">
                <Badge size="sm" variant="light" color="warn">
                  {COPY.running}
                </Badge>
                <Text size="sm" fw={500}>
                  {formatLeaveRange(running.startDate, running.endDate)}
                </Text>
                <Text size="xs" c="dimmed">
                  {COPY.days(running.days)}
                </Text>
              </Group>
              {running.note && (
                <Box>
                  <Text size="xs" c="dimmed">
                    {COPY.noteLabel}
                  </Text>
                  <Text size="sm">{running.note}</Text>
                </Box>
              )}
              <Text size="xs" c="dimmed">
                {COPY.noteOnlyHere}
              </Text>
            </>
          ) : (
            <Text size="sm">{COPY.here}</Text>
          )}
          <Group gap="xs" wrap="wrap">
            <Button variant="light" leftSection={<FiCalendar size="1.25em" />} onClick={onSet}>
              {running ? COPY.change : COPY.set}
            </Button>
            {running && (
              <Button
                variant="light"
                color="danger"
                leftSection={<FiXCircle size="1.25em" />}
                loading={busy}
                onClick={() => onEnd(running)}
              >
                {COPY.end}
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>

      <Text size="xs" c="dimmed" fw={600}>
        {COPY.historyTitle}
      </Text>
      {items.length === 0 ? (
        <Paper withBorder p="md">
          <Stack gap={4} align="center">
            <Text size="sm" fw={500}>
              {COPY.historyEmpty}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              {COPY.historyEmptyHint}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <UserLeaveHistory items={items} today={today} />
      )}
      {pages > 1 && (
        <Group justify="center">
          <Pagination value={page} total={pages} onChange={onPage} size="sm" siblings={0} />
        </Group>
      )}
    </Stack>
  );
}

type Props = {
  user: AdminUser;
  /** False while impersonating: the endpoint refuses, so the panel does not even ask. */
  canRecord: boolean;
  actions: ReturnType<typeof useUserActions>;
};

/** Reads one person's availability and hands it to the view; the drawer renders this. */
export function UserLeavePanel({ user, canRecord, actions }: Props) {
  const [page, setPage] = useState(1);
  const leave = useQuery({
    queryKey: userLeaveKey(user.id, page),
    queryFn: () => fetchUserLeave(user.id, page),
    enabled: canRecord,
  });

  if (!canRecord)
    return (
      <Text size="sm" c="dimmed">
        {COPY.impersonating}
      </Text>
    );
  if (leave.isPending) return <Skeleton h={96} radius="md" />;
  if (leave.isError)
    return (
      <Alert color="danger" icon={<FiAlertCircle size="1.25em" />} title={COPY.historyFailed}>
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm">{(leave.error as Error).message}</Text>
          <Button size="xs" variant="light" color="danger" onClick={() => leave.refetch()}>
            {COPY.retry}
          </Button>
        </Group>
      </Alert>
    );
  return (
    <UserLeaveView
      data={leave.data}
      busy={actions.busyId === user.id}
      page={page}
      onPage={setPage}
      onSet={() => actions.setLeave(user)}
      onEnd={(running) => actions.endLeave(user, running)}
    />
  );
}
