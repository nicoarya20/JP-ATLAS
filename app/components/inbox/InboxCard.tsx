/** One Inbox card: unread dot, who did it, the sentence, what it is about, and its one button. */
import { Avatar, Box, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { FiBell } from 'react-icons/fi';
import { Link } from 'react-router';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { InboxItem } from '~/lib/inbox-api';
import { contextLine, detailLines, headlineOf, type InboxClock } from '~/lib/inbox-view';
import { INBOX_COPY } from './inbox.copy';

export type InboxCardProps = {
  item: InboxItem;
  clock: InboxClock;
  /** The card's link was used: the page marks it read. */
  onOpen: (item: InboxItem) => void;
};

/** Width and height in px; Mantine's `w`/`h` scale them with the user's text size. */
const DOT_SIZE = 8;

/** A dot with a spoken label, so "unread" is not carried by colour alone. */
function UnreadDot({ unread }: { unread: boolean }) {
  return (
    <Box
      component="span"
      {...(unread ? { role: 'img', 'aria-label': INBOX_COPY.unread } : { 'aria-hidden': true })}
      w={DOT_SIZE}
      h={DOT_SIZE}
      // Drops the dot onto the headline's line rather than the top of the card.
      mt="md"
      flex="0 0 auto"
      bdrs="50%"
      bg={unread ? 'var(--mantine-primary-color-filled)' : 'transparent'}
    />
  );
}

function CardButtons({ item, onOpen }: InboxCardProps) {
  // An unknown kind has no label and nowhere to go, so it gets no button instead of a dead one.
  if (!item.button) return null;
  return (
    <Button
      component={Link}
      to={item.href}
      prefetch="intent"
      // Mobile: the button takes the full width under the text; desktop: it sits at the right edge.
      flex={{ base: 1, sm: 'none' }}
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
    <Paper withBorder p="sm" component="article" aria-label={headlineOf(item)}>
      <Group justify="space-between" wrap="wrap" gap="sm" align="center">
        <Group gap="sm" wrap="nowrap" align="flex-start" miw={0} flex="1 1 280px">
          <UnreadDot unread={!item.read} />
          {item.actor ? (
            <MemberAvatar name={item.actor.name} image={item.actor.image} size="md" />
          ) : (
            <Avatar radius="xl" size="md" color="gray" aria-hidden>
              <FiBell size="1.25em" />
            </Avatar>
          )}
          <Stack gap={4} miw={0}>
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
