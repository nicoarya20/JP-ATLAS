/** One entry of the task timeline: a comment (own ones can be changed or removed) or an activity line. */
import { ActionIcon, Button, Group, Menu, Paper, Stack, Text, Textarea } from '@mantine/core';
import { useState } from 'react';
import { FiEdit2, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import { WRAP_PRE_ANYWHERE } from '~/components/pm/text-wrap';
import { confirmAction } from '~/components/ui/confirmAction';
import { DateText } from '~/components/ui/DateText';
import type { TimelineEntry } from '~/lib/tasks-api';
import { TimelineText } from './TimelineText';
import { COMMENT_COPY, TIMELINE_COPY as COPY } from './task-body.copy';
import { activityDetail, activityText } from './task-timeline';
import { useCommentActions } from './useTaskBodyActions';

type Props = { entry: TimelineEntry; taskRef: string; viewerId: string; canComment: boolean };

function Byline({ entry, extra }: { entry: TimelineEntry; extra?: string }) {
  return (
    <Group gap={6} wrap="wrap">
      <Text size="sm" fw={600}>
        {entry.author.name}
      </Text>
      <DateText value={entry.at} mode="relative" />
      {extra && (
        <Text size="xs" c="dimmed">
          {extra}
        </Text>
      )}
    </Group>
  );
}

function CommentView({
  entry,
  taskRef,
  own,
}: {
  entry: Extract<TimelineEntry, { kind: 'comment' }>;
  taskRef: string;
  own: boolean;
}) {
  const { edit, remove } = useCommentActions(taskRef);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.body);
  const save = async () => {
    const res = await edit.run({ id: entry.id, body: draft });
    if (res.ok) setEditing(false);
  };
  const askRemove = () =>
    confirmAction({
      title: COPY.deleteTitle,
      body: COPY.deleteBody,
      confirmLabel: COPY.deleteComment,
      danger: true,
      onConfirm: () => void remove.run(entry.id),
    });
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap={6}>
        {/* nowrap is safe: the byline wraps itself beside one 44px icon button. */}
        <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
          <Byline entry={entry} extra={entry.editedAt ? COPY.edited : undefined} />
          {own && !editing && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={COPY.commentMenu}
                  flex="0 0 auto"
                >
                  <FiMoreHorizontal size="1.25em" aria-hidden />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<FiEdit2 size="1.25em" aria-hidden />}
                  onClick={() => setEditing(true)}
                >
                  {COPY.editComment}
                </Menu.Item>
                <Menu.Item
                  color="danger"
                  leftSection={<FiTrash2 size="1.25em" aria-hidden />}
                  onClick={askRemove}
                >
                  {COPY.deleteComment}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
        {editing ? (
          <Stack gap="xs">
            <Textarea
              aria-label={COMMENT_COPY.label}
              autosize
              minRows={2}
              maxRows={8}
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
            />
            <Group gap="xs" wrap="wrap">
              <Button loading={edit.loading} disabled={draft.trim() === ''} onClick={save}>
                {COPY.saveComment}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setEditing(false);
                  setDraft(entry.body);
                }}
              >
                {COPY.cancel}
              </Button>
            </Group>
          </Stack>
        ) : (
          <TimelineText text={entry.body} />
        )}
      </Stack>
    </Paper>
  );
}

export function TimelineItem({ entry, taskRef, viewerId, canComment }: Props) {
  if (entry.kind === 'comment') {
    const own = canComment && entry.author.id !== null && entry.author.id === viewerId;
    return <CommentView entry={entry} taskRef={taskRef} own={own} />;
  }
  const detail = activityDetail(entry);
  return (
    <Stack gap={2} px="xs">
      <Group gap={6} wrap="wrap">
        <Text size="sm" c="dimmed">
          <Text span fw={600} inherit>
            {entry.author.name}
          </Text>{' '}
          {activityText(entry)}
        </Text>
        <DateText value={entry.at} mode="relative" />
      </Group>
      {detail && (
        <Text size="xs" c="dimmed" style={WRAP_PRE_ANYWHERE}>
          {detail}
        </Text>
      )}
    </Stack>
  );
}
