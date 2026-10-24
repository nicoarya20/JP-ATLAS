// Events ④ / ④b detail (prototype events.detail.jsx): one screen for one-off and recurring events. An editor (anyone
// but a Member, or the Member who created it) gets the ⋯ menu (Cancel event, Move to Archive; a canceled event keeps
// only Archive) and Edit; everyone sees facts, attendees, agenda, the minutes box and who may change the event.
import { router, useLocalSearchParams } from 'expo-router';
import { Repeat } from 'lucide-react-native';

import { ActionMenu, type MenuAction } from '@/components/menu/action-menu';
import { StatusPill } from '@/components/status/status-pill';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Badge, BadgeIcon, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { monthDay } from '@/data/dates';
import { getEventDetail } from '@/data/events';
import { useEventsState } from '@/data/events.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { DETAIL } from '../events.strings';
import { EventMissing, EventPage } from '../parts/event-page';
import { Box, Bullets, EvHead, EvSec, Note } from '../parts/event-parts';
import { EventFacts } from './event-facts';
import { EventMinutes } from './event-minutes';

const ACCESS = { creator: DETAIL.youCreated, admin: DETAIL.asAdmin } as const;

/** The detail of the event in the route param `id`. */
export function EventDetailScreen({ role = SESSION_ROLE }: { role?: Role }) {
  useEventsState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = getEventDetail(role, id);
  if (!d) return <EventMissing />;
  const e = d.event;
  const items: MenuAction[] = d.menu.map((m) =>
    m === 'cancel'
      ? { label: DETAIL.cancel, onPress: () => router.push(`/events/${e.id}/cancel`) }
      : {
          label: DETAIL.archive,
          onPress: () => router.push(`/events/${e.id}/archive`),
          danger: true,
        },
  );
  const by = [
    DETAIL.createdBy(e.creator),
    e.updated && DETAIL.updated(monthDay(e.updated)),
    e.editor && DETAIL.by(e.editor),
  ].filter(Boolean);
  return (
    <EventPage
      testID="screen-event"
      title={DETAIL.title}
      right={
        items.length ? (
          <ActionMenu items={items} label={DETAIL.actions} testID="event-actions" />
        ) : undefined
      }
    >
      <EvHead title={e.title}>
        <StatusPill status={d.status} />
        <Badge variant="outline">
          <BadgeText>{e.type}</BadgeText>
        </Badge>
        {e.repeat && (
          <Badge>
            <BadgeIcon as={Repeat} />
            <BadgeText>{DETAIL.repeats}</BadgeText>
          </Badge>
        )}
      </EvHead>
      {e.canceled && (
        <Box testID="event-canceled">
          <Text className="text-subhead font-bold text-foreground">
            {DETAIL.canceledBy(e.canceled.by)}
          </Text>
          <Text className="text-subhead text-muted-foreground">{e.canceled.reason}</Text>
          {e.canceled.once && <Note>{DETAIL.canceledOnce}</Note>}
        </Box>
      )}
      {d.editor && !e.canceled && (
        <Button onPress={() => router.push({ pathname: '/events/new', params: { event: e.id } })}>
          <ButtonText>{DETAIL.edit}</ButtonText>
        </Button>
      )}
      <EventFacts event={e} project={d.project} />
      <EvSec title={DETAIL.attendees(d.attendees.length)}>
        {d.attendees.map((p) => (
          <HStack key={p.name} className="min-h-11 items-center gap-3">
            <Avatar className="h-7 w-7 bg-accent">
              <AvatarFallbackText className="text-footnote font-semibold text-accent-foreground">
                {p.name}
              </AvatarFallbackText>
            </Avatar>
            <Text className="flex-1 text-subhead text-foreground">{p.name}</Text>
            <Text className="text-footnote text-muted-foreground">
              {[p.creator && DETAIL.creator, p.noteTaker && DETAIL.noteTaker]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </HStack>
        ))}
      </EvSec>
      <EvSec title={DETAIL.agenda}>
        {e.agenda?.length ? <Bullets items={e.agenda} /> : <Note>{DETAIL.noAgenda}</Note>}
      </EvSec>
      {!e.canceled && (
        <EvSec title={DETAIL.minutes} tag={<StatusPill status={DETAIL.noneYet} />}>
          <EventMinutes event={e} />
        </EvSec>
      )}
      {d.access === 'member' ? (
        <Box>{DETAIL.memberAccess(e.creator)}</Box>
      ) : (
        d.access && <Note>{ACCESS[d.access]}</Note>
      )}
      <Note>{by.join(' · ')}</Note>
    </EventPage>
  );
}
