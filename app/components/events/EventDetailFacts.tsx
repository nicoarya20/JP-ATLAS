import { Anchor, Button, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router';
import type { EventDetail } from '~/lib/events-api';
import {
  formatEventDay,
  formatTimeRange,
  locationLabel,
  safeMeetingHref,
} from '~/lib/events-format';
import { DETAIL_COPY } from './event-detail.copy';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2} style={{ minWidth: 0 }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

type Props = { event: EventDetail; timeZone: string };

/** When, where, which project and who made the event; everything the guests need before they come. */
export function EventDetailFacts({ event, timeZone }: Props) {
  const place = locationLabel(event);
  const link = safeMeetingHref(event.meetingUrl);
  // A link that is not a web address is shown as plain text, never as an href.
  const rawLink = event.meetingUrl?.trim() || null;
  return (
    <Stack gap="md">
      <Fact label={DETAIL_COPY.when}>
        <Text fw={500}>{formatEventDay(event.startsAt, timeZone)}</Text>
        <Text size="sm">{formatTimeRange(event, timeZone)}</Text>
      </Fact>
      <Fact label={DETAIL_COPY.place}>
        <Text fw={500} style={{ overflowWrap: 'anywhere' }}>
          {place ?? DETAIL_COPY.noPlace}
        </Text>
        {rawLink && !link && (
          <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
            {rawLink}
          </Text>
        )}
        {link && (
          <div>
            <Button
              component="a"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              size="sm"
              leftSection={<FiExternalLink size="1.25em" aria-hidden />}
            >
              {DETAIL_COPY.openLink}
            </Button>
          </div>
        )}
      </Fact>
      <Fact label={DETAIL_COPY.project}>
        {event.project ? (
          <Anchor
            component={Link}
            to={`/app/projects/${encodeURIComponent(event.project.id)}`}
            fw={500}
            style={{ overflowWrap: 'anywhere' }}
          >
            {event.project.name}
          </Anchor>
        ) : (
          <Text c="dimmed">{DETAIL_COPY.noProject}</Text>
        )}
      </Fact>
      <Fact label={DETAIL_COPY.creator}>
        <Text style={{ overflowWrap: 'anywhere' }}>
          {event.creator?.name ?? DETAIL_COPY.noCreator}
        </Text>
      </Fact>
    </Stack>
  );
}
