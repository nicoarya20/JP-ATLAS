// Events ④ detail (prototype events.detail.jsx) from `GET /api/app/events/:id`: status and type, the cancel banner,
// Edit, the facts, the guests (creator first), the agenda, the minutes and who created it. What the viewer may do comes
// from the event's `can{}`: the ⋯ menu (Cancel event, Move to Trash) and Edit, greyed out with the reason when the
// server says why. An event that is gone or hidden answers 404: "Event not found".
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { StatusPill } from '@/components/status/status-pill';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { capReason } from '@/data/caps.messages';
import { type EventDetailView, eventDetailOf } from '@/data/events';
import { eventResource } from '@/data/events.api';

import { DETAIL } from '../events.strings';
import { EventMissing, EventPage } from '../parts/event-page';
import { Box, Bullets, EvHead, EvSec, Note } from '../parts/event-parts';
import { EventFacts } from './event-facts';
import { EventMenu } from './event-menu';
import { EventMinutes } from './event-minutes';

const NOT_FOUND = 404;

function Detail({ d }: { d: EventDetailView }) {
  const editWhy = capReason(d.can.update);
  return (
    <EventPage testID="screen-event" title={DETAIL.title} right={<EventMenu d={d} />}>
      <EvHead title={d.title}>
        <StatusPill status={d.status} />
        <Badge variant="outline">
          <BadgeText>{d.type}</BadgeText>
        </Badge>
      </EvHead>
      {d.canceled && (
        <Box testID="event-canceled">
          <Text className="text-subhead font-bold text-foreground">
            {d.canceled.by ? DETAIL.canceledBy(d.canceled.by) : DETAIL.canceled}
          </Text>
          <Text className="text-subhead text-muted-foreground">{d.canceled.reason}</Text>
        </Box>
      )}
      {d.can.update !== undefined && !d.canceled && (
        <>
          <Button
            testID="event-edit"
            isDisabled={d.can.update !== true}
            onPress={() => router.push({ pathname: '/events/new', params: { event: d.id } })}
          >
            <ButtonText>{DETAIL.edit}</ButtonText>
          </Button>
          {editWhy && <Note>{editWhy}</Note>}
        </>
      )}
      <EventFacts d={d} />
      <EvSec title={DETAIL.attendees(d.guests.length)}>
        {d.guests.map((p) => (
          <HStack key={p.id} className="min-h-11 items-center gap-3">
            <Avatar className="h-7 w-7 bg-accent">
              <AvatarFallbackText className="text-footnote font-semibold text-accent-foreground">
                {p.name}
              </AvatarFallbackText>
            </Avatar>
            <Text className="flex-1 text-subhead text-foreground">{p.name}</Text>
            {p.creator && (
              <Text className="text-footnote text-muted-foreground">{DETAIL.creator}</Text>
            )}
          </HStack>
        ))}
      </EvSec>
      <EvSec title={DETAIL.agenda}>
        {d.agenda.length ? <Bullets items={d.agenda} /> : <Note>{DETAIL.noAgenda}</Note>}
      </EvSec>
      <EventMinutes minutes={d.minutes} />
      <Note>{d.footer}</Note>
    </EventPage>
  );
}

/** The detail of the event in the route param `id`. */
export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = eventResource(id);
  const state = res.use();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  if (state.data) return <Detail d={eventDetailOf(state.data)} />;
  if (state.phase === 'failed' && state.error?.status === NOT_FOUND) return <EventMissing />;
  return (
    <EventPage testID="screen-event" title={DETAIL.title}>
      {state.phase === 'failed' ? (
        <FailedState
          testID="event-failed"
          message={state.error?.message}
          onRetry={() => void res.reload()}
        />
      ) : (
        <LoadingState testID="event-loading" />
      )}
    </EventPage>
  );
}
