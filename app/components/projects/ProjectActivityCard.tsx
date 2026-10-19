import { Group, Stack, Text } from '@mantine/core';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import { SectionCard } from '~/components/ui/SectionCard';
import { DETAIL_COPY as C } from './project-detail.copy';
import type { Activity } from './projects.detail.dummy';
import { shortDate } from './projects.read';

/** The latest things that happened on the project, newest first. */
export function ProjectActivityCard({
  activity,
  limit = 4,
}: {
  activity: readonly Activity[];
  limit?: number;
}) {
  return (
    <SectionCard title={C.activity}>
      {activity.length === 0 ? (
        <Text size="sm" c="dimmed">
          {C.activityEmpty}
        </Text>
      ) : (
        <Stack gap="sm">
          {activity.slice(0, limit).map((a) => (
            <Group
              key={`${a.date}-${a.who}-${a.text}`}
              justify="space-between"
              align="flex-start"
              wrap="nowrap"
              gap="sm"
            >
              <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
                <MemberAvatar name={a.who} />
                <div style={{ minWidth: 0 }}>
                  <Text size="sm">{`${a.who} ${a.text}`}</Text>
                  {a.note && (
                    <Text size="xs" c="dimmed">
                      {a.note}
                    </Text>
                  )}
                </div>
              </Group>
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {shortDate(a.date)}
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
