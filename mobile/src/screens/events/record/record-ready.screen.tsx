// Events ⑤ Recording mode, ready (prototype events.record.jsx RecordReady): the consent checkbox, Start recording (off
// until it is ticked), and other ways to take notes. No real audio in Phase 1 (K10).
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronRight, Circle, Mic, PenLine } from 'lucide-react-native';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import type { EventItem } from '@/data/events.shared';
import { findEvent, useEventsState } from '@/data/events.store';

import { RECORD } from '../events.strings.outcomes';
import { EventMissing, EventPage } from '../parts/event-page';
import { Ai, CheckRow, EvHead, EvSec, Note } from '../parts/event-parts';

/** Title with Ongoing and the event type (both recording screens). */
export function RecordHead({ e }: { e: EventItem }) {
  return (
    <EvHead title={e.title}>
      <StatusPill status={RECORD.ongoing} />
      <Badge variant="outline">
        <BadgeText>{e.type}</BadgeText>
      </Badge>
    </EvHead>
  );
}

/** The big microphone disc; live while recording. */
export function MicDisc({ live }: { live?: boolean }) {
  return (
    <VStack
      className={`h-24 w-24 items-center justify-center rounded-full ${live ? 'bg-danger-soft' : 'bg-muted'}`}
    >
      <Icon as={Mic} className={`h-9 w-9 ${live ? 'text-destructive' : 'text-foreground'}`} />
    </VStack>
  );
}

/** Ready to record the event in the route param `id`. */
export function RecordReadyScreen() {
  useEventsState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [told, setTold] = useState(false);
  const e = findEvent(id);
  if (!e) return <EventMissing />;
  return (
    <EventPage testID="screen-record" title={RECORD.title}>
      <RecordHead e={e} />
      <Button variant="link" className="self-start" onPress={() => router.push(`/events/${e.id}`)}>
        <ButtonText>{RECORD.details}</ButtonText>
        <ButtonIcon as={ChevronRight} />
      </Button>
      <VStack className="gap-1 rounded-card bg-card p-3">
        <CheckRow label={RECORD.consent} value={told} onChange={setTold} />
        <Note>{RECORD.required}</Note>
      </VStack>
      <VStack className="items-center gap-4 py-4">
        <MicDisc />
        <Button isDisabled={!told} onPress={() => router.push(`/events/${e.id}/recording`)}>
          <ButtonIcon as={Circle} />
          <ButtonText>{RECORD.start}</ButtonText>
        </Button>
      </VStack>
      <EvSec title={RECORD.otherWays}>
        <Button variant="outline" onPress={() => router.push(`/events/${e.id}/outcomes/2`)}>
          <ButtonIcon as={PenLine} />
          <ButtonText>{RECORD.typeNotes}</ButtonText>
        </Button>
        <Button variant="outline" onPress={() => notice(RECORD.photoNotice)}>
          <ButtonIcon as={Camera} />
          <HStack className="items-center gap-1">
            <ButtonText>{RECORD.photo}</ButtonText>
            <Ai />
          </HStack>
        </Button>
      </EvSec>
      <Note>{RECORD.mic}</Note>
    </EventPage>
  );
}
