import { Avatar, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { FiInbox } from 'react-icons/fi';
import { Link } from 'react-router';
import { EmptyState } from '~/components/ui/EmptyState';
import type { InboxItem } from './inbox.dummy';

/** Message rows with an unread dot, avatar, text and one action. */
export function InboxList({ items, emptyTitle }: { items: InboxItem[]; emptyTitle: string }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FiInbox}
        title={emptyTitle}
        description="Kabar dan permintaan baru akan muncul di sini."
      />
    );
  }
  return (
    <Stack gap="xs">
      {items.map((i) => (
        <Paper key={i.id} withBorder p="sm" radius="md">
          <Group justify="space-between" wrap="wrap" gap="sm" align="center">
            <Group
              gap="sm"
              wrap="nowrap"
              align="flex-start"
              style={{ minWidth: 0, flex: '1 1 280px' }}
            >
              <span
                {...(i.unread
                  ? { role: 'img', 'aria-label': 'Belum dibaca' }
                  : { 'aria-hidden': true })}
                style={{
                  width: 8,
                  height: 8,
                  marginTop: 14,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: i.unread ? 'var(--mantine-color-text)' : 'transparent',
                }}
              />
              <Avatar radius="xl" color="initials" name={i.actor} />
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={700}>{i.title}</Text>
                <Text size="sm">{i.detail}</Text>
                <Text size="xs" c="dimmed">{`${i.project} · ${i.when}`}</Text>
              </Stack>
            </Group>
            <Button component={Link} to={i.to} variant={i.actionLabel ? 'filled' : 'default'}>
              {i.actionLabel ?? 'Buka'}
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
