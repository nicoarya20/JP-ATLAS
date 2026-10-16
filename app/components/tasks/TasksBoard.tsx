import { Anchor, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';
import { PriorityBadge } from '~/components/pm/PriorityBadge';
import { formatCalendarDate } from '~/components/ui/DateText';
import { TASK_STATUS_LABELS } from '~/lib/pm-labels';
import { taskMeta } from './TasksList';
import type { DummyTask } from './tasks.dummy';

const COLUMNS = ['todo', 'in_progress', 'in_review', 'done'] as const;

/** "Papan" view: one column per status, cards link to the task page. */
export function TasksBoard({ rows }: { rows: DummyTask[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" style={{ alignItems: 'start' }}>
      {COLUMNS.map((status) => {
        const items = rows.filter((t) => t.status === status);
        return (
          <Stack key={status} gap="xs">
            <Text fw={700} size="sm">{`${TASK_STATUS_LABELS[status].label} ${items.length}`}</Text>
            {items.length === 0 && (
              <Text size="xs" c="dimmed">
                Belum ada tugas
              </Text>
            )}
            {items.map((t) => (
              <Paper key={t.number} withBorder p="sm" radius="md">
                <Stack gap={4}>
                  <Anchor component={Link} to={`/app/tasks/${t.number}`} fw={600} c="inherit">
                    {t.title}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {taskMeta(t)}
                  </Text>
                  <PriorityBadge priority={t.priority} />
                  <Text size="xs">{formatCalendarDate(t.due)}</Text>
                </Stack>
              </Paper>
            ))}
          </Stack>
        );
      })}
    </SimpleGrid>
  );
}
