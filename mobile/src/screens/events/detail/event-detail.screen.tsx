// Events ④ detail (prototype events.detail.jsx): the facts, the guest list, the agenda, the minutes
// box and who may change the event.
//
// Every control here follows the server's `can{}` (map §3): the ⋯ menu and Edit are drawn only for
// the capabilities it sent, and shown disabled with its own reason when it sent a code instead of
// `true`. There is no role test on this screen, and there must not be one.
//
// Gone from the prototype, all of them recorded in `mobile/docs/phase2-gap-disembunyikan.md`: the
// Repeats pill (GAP-A4), the "only this occurrence" note (A5), the Note-taker role (A6), and the
// "by <editor>" part of the footer (A7).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ActionMenu, type MenuAction } from '@/components/menu/action-menu';
import { StatusPill } from '@/components/status/status-pill';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { monthDay } from '@/data/dates';
import { getEventDetail } from '@/data/events';
import { eventDetailResource } from '@/data/events.api';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { DETAIL } from '../events.strings';
import { EventPage } from '../parts/event-page';
import { Box, Bullets, EvHead, EvSec, Note } from '../parts/event-parts';
import { EventGone, EventsFailed, EventsLoading } from '../parts/event-state';
import { EventFacts } from './event-facts';
import { EventMinutes } from './event-minutes';

const ACCESS = { creator: DETAIL.youCreated, manager: DETAIL.asManager } as const;

/** The detail of the event in the route param `id`. */
export function EventDetailScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resource = eventDetailResource(id);
  const state = resource.use();
  useEffect(() => {
    void resource.ensure();
  }, [resource]);
  const d = getEventDetail(role, id);

  if (!d) {
    const body =
      state.phase !== 'failed' ? (
        <EventsLoading />
      ) : state.error?.status === 404 ? (
        <EventGone />
      ) : (
        <EventsFailed
          message={state.error?.message}
          onRetry={() => {
            void resource.reload();
          }}
        />
      );
    return (
      <EventPage testID="screen-event" title={DETAIL.title}>
        {body}
      </EventPage>
    );
  }

  const e = d.event;
  // Only what may be used goes in the menu. The shared ActionMenu has no disabled item, so a
  // capability the server sent as a code (impersonating, project in the Trash) is told as a line
  // under the head instead — the reason is shown either way, which is what `can{}` asks for.
  const items: MenuAction[] = d.menu
    .filter((m) => m.enabled)
    .map((m) =>
      m.action === 'cancel'
        ? { label: DETAIL.cancel, onPress: () => router.push(`/events/${e.id}/cancel`) }
        : {
            label: DETAIL.archive,
            onPress: () => router.push(`/events/${e.id}/archive`),
            danger: true,
          },
    );
  const blocked = [...new Set(d.menu.filter((m) => !m.enabled).map((m) => m.reason))].filter(
    (reason): reason is string => !!reason,
  );
  const by = [DETAIL.createdBy(e.creator), e.updated && DETAIL.updated(monthDay(e.updated))].filter(
    Boolean,
  );
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
      </EvHead>
      {blocked.map((reason) => (
        <Note key={reason}>{reason}</Note>
      ))}
      {e.canceled && (
        <Box testID="event-canceled">
          <Text className="text-subhead font-bold text-foreground">
            {DETAIL.canceledBy(e.canceled.by)}
          </Text>
          <Text className="text-subhead text-muted-foreground">{e.canceled.reason}</Text>
        </Box>
      )}
      {d.edit !== 'hidden' && !e.canceled && (
        <>
          <Button
            isDisabled={d.edit === 'disabled'}
            onPress={() => router.push({ pathname: '/events/new', params: { event: e.id } })}
          >
            <ButtonText>{DETAIL.edit}</ButtonText>
          </Button>
          {d.editReason && <Note>{d.editReason}</Note>}
        </>
      )}
      <EventFacts event={e} project={d.project} />
      <EvSec title={DETAIL.attendees(d.attendees.length)}>
        {d.attendees.map((p) => (
          <HStack key={p.userId || p.name} className="min-h-11 items-center gap-3">
            <Avatar className="h-7 w-7 bg-accent">
              <AvatarFallbackText className="text-footnote font-semibold text-accent-foreground">
                {p.name}
              </AvatarFallbackText>
            </Avatar>
            <Text className="flex-1 text-subhead text-foreground">{p.name}</Text>
            <Text className="text-footnote text-muted-foreground">
              {p.creator ? DETAIL.creator : ''}
            </Text>
          </HStack>
        ))}
      </EvSec>
      <EvSec title={DETAIL.agenda}>
        {e.agenda?.length ? <Bullets items={e.agenda} /> : <Note>{DETAIL.noAgenda}</Note>}
      </EvSec>
      {!e.canceled && <EventMinutes event={e} />}
      {d.access === 'guest' ? (
        <Box>{DETAIL.guestAccess(e.creator)}</Box>
      ) : (
        <Note>{ACCESS[d.access]}</Note>
      )}
      <Note>{by.join(' · ')}</Note>
    </EventPage>
  );
}
