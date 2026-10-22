/** "Obrolan & riwayat" (S2-13): comments and activity as one stream from the timeline, newest first. */
import { Alert, Button, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { FiMessageSquare } from 'react-icons/fi';
import { useTimeline } from '~/lib/tasks-api';
import { CommentBox } from './CommentBox';
import { TimelineItem } from './TimelineItem';
import { TIMELINE_COPY as COPY } from './task-body.copy';

type Props = {
  taskRef: string;
  viewerId: string;
  /** From `can.comment`: shows the box and lets the viewer change their own comments. */
  canComment: boolean;
};

export function TaskTimeline({ taskRef, viewerId, canComment }: Props) {
  const q = useTimeline(taskRef);
  const entries = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Paper withBorder p={{ base: 'sm', md: 'md' }} radius="md">
      <Stack gap="sm">
        <Title order={3}>{COPY.title}</Title>
        {canComment && <CommentBox taskRef={taskRef} />}
        {q.isPending && (
          <Text c="dimmed" role="status">
            <Loader size="xs" mr="xs" />
            {COPY.loading}
          </Text>
        )}
        {q.isError && (
          <Alert color="danger" variant="light">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{COPY.loadFailed}</Text>
              <Button variant="default" onClick={() => void q.refetch()}>
                {COPY.retry}
              </Button>
            </Stack>
          </Alert>
        )}
        {q.isSuccess && entries.length === 0 && (
          <Stack gap={4} align="center" py="md">
            <FiMessageSquare size="2em" aria-hidden />
            <Text c="dimmed">{COPY.empty}</Text>
          </Stack>
        )}
        <Stack gap="xs">
          {entries.map((entry) => (
            <TimelineItem
              key={`${entry.kind}:${entry.id}`}
              entry={entry}
              taskRef={taskRef}
              viewerId={viewerId}
              canComment={canComment}
            />
          ))}
        </Stack>
        {q.hasNextPage && (
          <Button
            variant="default"
            loading={q.isFetchingNextPage}
            onClick={() => void q.fetchNextPage()}
          >
            {COPY.more}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
