/** One Inbox card: unread dot, who did it, the sentence, what it is about, and one button (two for a leave approval). */
import { Avatar, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { FiBell } from 'react-icons/fi';
import { Link } from 'react-router';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { InboxItem } from '~/lib/inbox-api';
import {
  contextLine,
  detailLines,
  headlineOf,
  type InboxClock,
  isLeaveApproval,
} from '~/lib/inbox-view';
import { INBOX_COPY } from './inbox.copy';

export type InboxCardProps = {
  item: InboxItem;
  clock: InboxClock;
  /** True while this card's leave approval is being sent; its "Setujui" spins. */
  busy?: boolean;
  /** The card's link was used: the page marks it read. */
  onOpen: (item: InboxItem) => void;
  onApprove: (item: InboxItem) => void;
  onReject: (item: InboxItem) => void;
};

/** A dot with a spoken label, so "unread" is not carried by colour alone. */
function UnreadDot({ unread }: { unread: boolean }) {
  return (
    <span
      {...(unread ? { role: 'img', 'aria-label': INBOX_COPY.unread } : { 'aria-hidden': true })}
      style={{
        width: 8,
        height: 8,
        marginTop: 18,
        flexShrink: 0,
        borderRadius: '50%',
        background: unread ? 'var(--mantine-primary-color-filled)' : 'transparent',
      }}
    />
  );
}

function CardButtons({ item, busy, onOpen, onApprove, onReject }: InboxCardProps) {
  // Mobile: buttons share the full width under the text; desktop: they sit at the right edge.
  const grow = { base: 1, sm: 'none' } as const;
  if (isLeaveApproval(item)) {
    return (
      <>
        <Button variant="default" flex={grow} disabled={busy} onClick={() => onReject(item)}>
          {item.secondaryButton}
        </Button>
        <Button flex={grow} loading={busy} onClick={() => onApprove(item)}>
          {item.button}
        </Button>
      </>
    );
  }
  // An unknown kind has no label and nowhere to go, so it gets no button instead of a dead one.
  if (!item.button) return null;
  return (
    <Button
      component={Link}
      to={item.href}
      prefetch="intent"
      flex={grow}
      variant={item.lane === 'action' ? 'filled' : 'default'}
      onClick={() => onOpen(item)}
    >
      {item.button}
    </Button>
  );
}

export function InboxCard(props: InboxCardProps) {
  const { item, clock } = props;
  const lines = detailLines(item, clock);
  return (
    <Paper withBorder p="sm" radius="md" component="article" aria-label={headlineOf(item)}>
      <Group justify="space-between" wrap="wrap" gap="sm" align="center">
        <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0, flex: '1 1 280px' }}>
          <UnreadDot unread={!item.read} />
          {item.actor ? (
            <MemberAvatar name={item.actor.name} image={item.actor.image} size="md" />
          ) : (
            <Avatar radius="xl" size="md" color="gray" aria-hidden>
              <FiBell size="1.25em" />
            </Avatar>
          )}
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={700}>{headlineOf(item)}</Text>
            {lines.map((line) => (
              <Text key={line} size="sm" lineClamp={2}>
                {line}
              </Text>
            ))}
            <Text size="xs" c="dimmed">
              {contextLine(item, clock)}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs" wrap="wrap" w={{ base: '100%', sm: 'auto' }} justify="flex-end">
          <CardButtons {...props} />
        </Group>
      </Group>
    </Paper>
  );
}
