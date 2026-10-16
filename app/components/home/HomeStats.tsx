import { Paper, SimpleGrid, Text } from '@mantine/core';
import { DUMMY_STATS } from './home.dummy';

/** Row of summary tiles at the top of Beranda. */
export function HomeStats() {
  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
      {DUMMY_STATS.map((s) => (
        <Paper key={s.key} withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            {s.label}
          </Text>
          <Text fz={32} fw={700} lh={1.2}>
            {s.value}
          </Text>
          <Text size="xs" c="dimmed">
            {s.hint}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
