/**
 * The event detail body (S7 E-11, P6 §4): title, status and kind, the canceled banner, when and
 * where, agenda, guests and a passive Notulensi note. There is no edit form and no guest editing
 * here; the actions live in the ⋯ menu and follow the server's `can{}`.
 */
import { Alert, Box, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiXCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { WRAP_ANYWHERE, WRAP_PRE_ANYWHERE } from '~/components/pm/text-wrap';
import { BackLink } from '~/components/ui/BackLink';
import { PageContainer } from '~/components/ui/PageContainer';
import { EVENTS_PATH, type EventDetail, eventHref } from '~/lib/events-api';
import { type EventsClock, eventStatus } from '~/lib/events-format';
import { EventDetailFacts } from './EventDetailFacts';
import { EventDetailMenu } from './EventDetailMenu';
import { EventDetailPeople } from './EventDetailPeople';
import { EventKindBadge } from './EventKindBadge';
import { EventStatusBadge } from './EventStatusBadge';
import { DETAIL_COPY } from './event-detail.copy';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper withBorder p={{ base: 'sm', md: 'md' }}>
      <Stack gap="xs">
        <Title order={3}>{title}</Title>
        {children}
      </Stack>
    </Paper>
  );
}

function CanceledBanner({ event }: { event: EventDetail }) {
  return (
    <Alert
      color="danger"
      icon={<FiXCircle size="1.25em" aria-hidden />}
      title={DETAIL_COPY.canceledTitle}
    >
      <Stack gap={4}>
        {event.cancelReason && (
          <Text size="sm" style={WRAP_PRE_ANYWHERE}>
            {DETAIL_COPY.canceledReason(event.cancelReason)}
          </Text>
        )}
        {event.canceledBy && (
          <Text size="sm" c="dimmed">
            {DETAIL_COPY.canceledBy(event.canceledBy.name)}
          </Text>
        )}
      </Stack>
    </Alert>
  );
}

type Props = { event: EventDetail; clock: EventsClock };

export function EventDetailView({ event, clock }: Props) {
  const navigate = useNavigate();
  const status = eventStatus(event, clock.now);
  return (
    <PageContainer size="narrow">
      <Box>
        <BackLink fallback={EVENTS_PATH} label={DETAIL_COPY.back} />
      </Box>
      <Stack gap="sm">
        {/* nowrap is safe: the only button is one icon and the title wraps inside its own column. */}
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
          <Title order={2} miw={0} style={WRAP_ANYWHERE}>
            {event.title}
          </Title>
          <EventDetailMenu
            event={event}
            status={status}
            // The event is in the Trash now: leave for the list (the toast offers Urungkan), and
            // come back to the event if the user takes it back.
            afterDelete={() => navigate(EVENTS_PATH)}
            afterRestore={(id) => navigate(eventHref(id))}
          />
        </Group>
        <Group gap="xs" wrap="wrap">
          <EventStatusBadge status={status} />
          <EventKindBadge kind={event.kind} />
        </Group>
        {event.canceledAt && <CanceledBanner event={event} />}
      </Stack>
      <Stack gap="lg">
        <Paper withBorder p={{ base: 'sm', md: 'md' }}>
          <EventDetailFacts event={event} timeZone={clock.timeZone} />
        </Paper>
        <Section title={DETAIL_COPY.agenda}>
          {event.agenda?.trim() ? (
            // User text: keep line breaks, render as plain text (never HTML).
            <Text style={WRAP_PRE_ANYWHERE}>{event.agenda}</Text>
          ) : (
            <Text c="dimmed">{DETAIL_COPY.noAgenda}</Text>
          )}
        </Section>
        <Section title={`${DETAIL_COPY.participants} (${event.participants.length})`}>
          <EventDetailPeople people={event.participants} creatorId={event.creator?.id ?? null} />
        </Section>
        <Section title={DETAIL_COPY.notes}>
          <Text c="dimmed">{DETAIL_COPY.notesSoon}</Text>
        </Section>
      </Stack>
    </PageContainer>
  );
}
