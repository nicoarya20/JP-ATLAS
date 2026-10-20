import { Anchor, Divider, Group, Stack, Text } from '@mantine/core';
import type { HomeDone as Done, Widget } from '@server/home/home.dto';
import { Link } from 'react-router';
import { HomeSection, type Retry } from './HomeSection';
import { HOME_COPY, HOME_LINKS } from './home.copy';

/** "Tasks Completed This Week": what the team finished since Monday, who did it and which day. */
export function HomeDone({ widget, retry }: { widget: Widget<Done>; retry: Retry }) {
  return (
    <HomeSection title={HOME_COPY.done.title} widget={widget} retry={retry}>
      {({ items, total }) =>
        items.length === 0 ? (
          <Text size="sm" c="dimmed">
            {HOME_COPY.done.empty}
          </Text>
        ) : (
          <>
            <Stack gap={0}>
              {items.map((t, i) => (
                <div key={t.id}>
                  {i > 0 && <Divider />}
                  <Group justify="space-between" wrap="wrap" gap="xs" py="xs">
                    <Stack gap={0} style={{ minWidth: 0, flex: '1 1 12rem' }}>
                      <Anchor component={Link} to={`/app/tasks/${t.number}`} c="inherit">
                        {t.title}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {t.project.name}
                      </Text>
                    </Stack>
                    <Text size="xs" c="dimmed">
                      {`${t.byName} · ${t.dayLabel}`}
                    </Text>
                  </Group>
                </div>
              ))}
            </Stack>
            <Anchor component={Link} to={HOME_LINKS.doneTasks} fw={600} size="sm">
              {HOME_COPY.done.more(total)}
            </Anchor>
          </>
        )
      }
    </HomeSection>
  );
}
