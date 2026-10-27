import { Group, Paper, SimpleGrid, Text } from '@mantine/core';
import type { HomeCounters as Counters, Widget } from '@server/home/home.dto';
import { type Retry, WidgetError } from './HomeSection';
import { HOME_COPY } from './home.copy';

const TILES = ['unassigned', 'inProgress', 'completed'] as const;

/** Why the tiles are not shown: the viewer manages no project, or belongs to none. */
const reasonFor = (c: Counters) =>
  c.memberProjects === 0 ? HOME_COPY.counters.noProject : HOME_COPY.counters.notManager;

/** Three number tiles over the projects the viewer manages; without any, one sentence says why. */
export function HomeCounters({ widget, retry }: { widget: Widget<Counters>; retry: Retry }) {
  if (!widget.ok) {
    return (
      <Paper withBorder p="md">
        <WidgetError {...retry} />
      </Paper>
    );
  }
  if (widget.data.managedProjects === 0) {
    return (
      <Paper withBorder p="md">
        <Text size="sm" c="dimmed">
          {reasonFor(widget.data)}
        </Text>
      </Paper>
    );
  }
  return (
    <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
      {TILES.map((key) => (
        <Paper key={key} withBorder p="md">
          <Text size="sm" fw={600}>
            {HOME_COPY.counters[key].label}
          </Text>
          <Group gap="xs" align="baseline" wrap="nowrap">
            <Text fz={32} fw={700} lh={1.2}>
              {widget.data[key]}
            </Text>
            <Text size="sm">{HOME_COPY.counters.unit}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {HOME_COPY.counters[key].hint}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
