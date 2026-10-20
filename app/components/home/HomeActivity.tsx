import { Anchor, Group, Text } from '@mantine/core';
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
      <FiActivity size="1.25em" aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
      <div style={{ minWidth: 0 }}>
        <Anchor component={Link} to={`/app/tasks/${item.taskNumber}`} size="sm" c="inherit">
          {item.text}
        </Anchor>
        <Text size="xs" c="dimmed">
          {`${item.projectName} · ${time.relative(item.at)}`}
        </Text>
      </div>
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
