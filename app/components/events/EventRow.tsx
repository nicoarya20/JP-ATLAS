/** One event as a card: time on the left, title link, kind, status and place; the card opens the detail. */
import { Anchor, Group, Paper, Stack, Text } from '@mantine/core';
import { FiMapPin } from 'react-icons/fi';
import { Link } from 'react-router';
import { type EventListItem, eventHref } from '~/lib/events-api';
import { type EventsClock, eventStatus, formatTimeRange, locationLabel } from '~/lib/events-format';
import '../projects/project-click.css';
import { EventKindBadge } from './EventKindBadge';
import { EventStatusBadge } from './EventStatusBadge';
import { ParticipantCount } from './ParticipantList';

/** Class names of `project-click.css`: the card is the click area, the title link stretches over it. */
const CLICK_CARD = 'mk-click-card';
const ROW_LINK = 'mk-row-link';

export function EventRow({ event, clock }: { event: EventListItem; clock: EventsClock }) {
  const status = eventStatus(event, clock.now);
  const place = locationLabel(event);
  const canceled = status === 'canceled';
  return (
    <Paper withBorder p="sm" className={CLICK_CARD}>
      <Group gap="sm" align="flex-start" wrap="wrap">
        <Text fw={700} size="sm" miw="6.5rem" td={canceled ? 'line-through' : undefined}>
          {formatTimeRange(event, clock.timeZone)}
        </Text>
        {/* Truncated, not wrapped: every card in the list keeps the same height (K-5). */}
        <Stack gap="xs" flex="1 1 14rem" miw={0}>
          <Anchor
            component={Link}
            to={eventHref(event.id)}
            className={ROW_LINK}
            fw={700}
            td={canceled ? 'line-through' : undefined}
            lineClamp={2}
          >
            {event.title}
          </Anchor>
          <Group gap="xs" wrap="wrap">
            <EventKindBadge kind={event.kind} />
            <EventStatusBadge status={status} />
          </Group>
          <Group gap="sm" wrap="wrap">
            {place && (
              <Group gap={4} wrap="nowrap" c="dimmed" miw={0}>
                <FiMapPin size="1.25em" aria-hidden />
                <Text size="xs" c="inherit" truncate>
                  {place}
                </Text>
              </Group>
            )}
            {event.project && (
              <Text size="xs" c="dimmed" truncate>
                {event.project.name}
              </Text>
            )}
            <ParticipantCount
              total={event.participants.total}
              invited={event.participants.isParticipant}
            />
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
