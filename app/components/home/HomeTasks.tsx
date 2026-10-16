import { Anchor, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { PriorityBadge } from '~/components/pm/PriorityBadge';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { DateText } from '~/components/ui/DateText';
import { DUMMY_TASKS } from './home.dummy';

/** "Tugas saya" list: card rows so every field stays visible on a 375px phone. */
export function HomeTasks() {
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="wrap">
        <Title order={5}>Tugas saya</Title>
        <Anchor component={Link} to="/app/tasks" size="sm">
          Lihat semua
        </Anchor>
      </Group>
      {DUMMY_TASKS.map((t) => (
        <Paper key={t.number} withBorder p="sm" radius="md">
          <Stack gap={6}>
            <Anchor
              component={Link}
              to={`/app/tasks/${t.number}`}
              fw={600}
              c="inherit"
              style={{ minWidth: 0 }}
            >
              {t.title}
            </Anchor>
            <Text size="xs" c="dimmed">
              {t.project}
            </Text>
            <Group gap="xs" wrap="wrap" justify="space-between">
              <Group gap="xs" wrap="wrap">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </Group>
              <DateText value={t.due} mode="due" settled={t.status === 'done'} />
            </Group>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
