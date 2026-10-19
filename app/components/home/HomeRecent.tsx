import { Anchor, Divider, Group, Stack, Text } from '@mantine/core';
import { FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router';
import { SectionCard } from '~/components/ui/SectionCard';
import { COMPLETED_THIS_WEEK, LATEST_ACTIVITY } from './home.dummy';

/** "Tasks Completed This Week" and "Latest Activity" cards. */
export function HomeRecent() {
  return (
    <>
      <SectionCard title="Tasks Completed This Week">
        <Stack gap={0}>
          {COMPLETED_THIS_WEEK.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <Divider />}
              <Group justify="space-between" wrap="wrap" gap="xs" py="xs">
                <Text>{t.title}</Text>
                <Text size="xs" c="dimmed">
                  {t.meta}
                </Text>
              </Group>
            </div>
          ))}
        </Stack>
        <Anchor component={Link} to="/app/tasks" fw={600} size="sm">
          Lihat semua
        </Anchor>
      </SectionCard>
      <SectionCard title="Latest Activity">
        {LATEST_ACTIVITY.map((a) => (
          <Group key={a.id} gap="sm" wrap="nowrap" align="flex-start">
            <FiCheckCircle size="1.25em" aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
            <div style={{ minWidth: 0 }}>
              <Text size="sm">{a.text}</Text>
              <Text size="xs" c="dimmed">
                {a.meta}
              </Text>
            </div>
          </Group>
        ))}
      </SectionCard>
    </>
  );
}
