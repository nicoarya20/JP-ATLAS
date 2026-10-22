import { Anchor, Group, Stack, Text } from '@mantine/core';
import type { HomeAgendaItem } from '@server/home/home.dto';
import { FiCalendar } from 'react-icons/fi';
import { Link } from 'react-router';
import { EmptyState } from '~/components/ui/EmptyState';
import { eventHref } from '~/lib/events-api';
import { formatEventTime } from '~/lib/events-format';
import { HOME_COPY, HOME_LINKS } from './home.copy';

type Props = { items: HomeAgendaItem[]; timeZone: string };

const DAYS = [
  { day: 'today', label: HOME_COPY.agenda.today },
  { day: 'tomorrow', label: HOME_COPY.agenda.tomorrow },
] as const;

/** My events still ahead or running, under "Hari ini" and "Besok"; the server decided which day each is. */
export function HomeAgendaList({ items, timeZone }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FiCalendar}
        title={HOME_COPY.agenda.empty}
        action={{ label: HOME_COPY.agenda.emptyAction, to: HOME_LINKS.events }}
      />
    );
  }
  return (
    <Stack gap="xs">
      {DAYS.map(({ day, label }) => {
        const rows = items.filter((e) => e.day === day);
        if (rows.length === 0) return null;
        return (
          <Stack key={day} gap="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {label}
            </Text>
            {rows.map((e) => (
              <Group key={e.id} gap="md" align="flex-start" wrap="nowrap">
                <Text fw={700} style={{ flexShrink: 0 }}>
                  {formatEventTime(e.startsAt, timeZone)}
                </Text>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Anchor component={Link} to={eventHref(e.id)} fw={600} c="inherit">
                    {e.title}
                  </Anchor>
                  {e.project && (
                    <Text size="xs" c="dimmed">
                      {e.project.name}
                    </Text>
                  )}
                </Stack>
              </Group>
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
