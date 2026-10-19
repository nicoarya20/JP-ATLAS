import { Group, Paper, SimpleGrid, Text } from '@mantine/core';
import { COUNTERS } from './home.dummy';

/** Three number tiles: unassigned, in progress, completed. */
export function HomeCounters() {
  return (
    <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
      {COUNTERS.map((c) => (
        <Paper key={c.key} withBorder p="md" radius="md">
          <Text size="sm" fw={600}>
            {c.label}
          </Text>
          <Group gap="xs" align="baseline" wrap="nowrap">
            <Text fz={32} fw={700} lh={1.2}>
              {c.value}
            </Text>
            <Text size="sm">tugas</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {c.hint}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
