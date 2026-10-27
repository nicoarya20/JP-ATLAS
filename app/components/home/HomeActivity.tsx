import { Anchor, Box, Group, Text } from '@mantine/core';
import type { HomeActivityItem, Widget } from '@server/home/home.dto';
import { FiActivity } from 'react-icons/fi';
import { Link } from 'react-router';
import { useTimeFormat } from '~/lib/time-format';
import { HomeSection, type Retry } from './HomeSection';
import { HOME_COPY } from './home.copy';

function ActivityRow({ item }: { item: HomeActivityItem }) {
  // Same root clock on the server render and after hydration, so the relative time never flips text.
  const time = useTimeFormat();
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      {/* A react-icons SVG takes no Mantine style props; the em nudge keeps the glyph on the
          first text line at every text size, which a pixel offset would not. */}
      <FiActivity size="1.25em" aria-hidden style={{ flexShrink: 0, marginTop: '0.2em' }} />
      <Box miw={0}>
        <Anchor component={Link} to={`/app/tasks/${item.taskNumber}`} size="sm" c="inherit">
          {item.text}
        </Anchor>
        <Text size="xs" c="dimmed">
          {`${item.projectName} · ${time.relative(item.at)}`}
        </Text>
      </Box>
    </Group>
  );
}

/** "Latest Activity": the newest changes and comments in the viewer's projects. */
export function HomeActivity({
  widget,
  retry,
}: {
  widget: Widget<HomeActivityItem[]>;
  retry: Retry;
}) {
  return (
    <HomeSection title={HOME_COPY.activity.title} widget={widget} retry={retry}>
      {(items) =>
        items.length === 0 ? (
          <Text size="sm" c="dimmed">
            {HOME_COPY.activity.empty}
          </Text>
        ) : (
          items.map((i) => <ActivityRow key={i.id} item={i} />)
        )
      }
    </HomeSection>
  );
}
