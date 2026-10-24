// Ways to write an event's minutes (prototype events.detail.jsx Minutes): Type and Photo anytime, Voice from the start
// time. Photo stays a notice in Phase 1 (K10).
import { router } from 'expo-router';
import { Camera, Mic, PenLine } from 'lucide-react-native';

import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type EventItem, eventStart } from '@/data/events.shared';

import { DETAIL } from '../events.strings';
import { AiNote } from '../parts/event-parts';

/** The grey minutes box with its three buttons. */
export function EventMinutes({ event: e }: { event: EventItem }) {
  const notice = useNotice();
  const start = eventStart(e);
  return (
    <VStack className="gap-2 rounded-card bg-muted p-3">
      <Text className="text-subhead text-foreground">{DETAIL.minutesLead(start)}</Text>
      <Button variant="outline" onPress={() => router.push(`/events/${e.id}/outcomes/2`)}>
        <ButtonIcon as={PenLine} />
        <ButtonText>{DETAIL.type}</ButtonText>
      </Button>
      <Button variant="outline" onPress={() => notice(DETAIL.photoNotice)}>
        <ButtonIcon as={Camera} />
        <ButtonText>{DETAIL.photo}</ButtonText>
      </Button>
      <Button variant="outline" onPress={() => router.push(`/events/${e.id}/record`)}>
        <ButtonIcon as={Mic} />
        <ButtonText>{DETAIL.voice(start)}</ButtonText>
      </Button>
      <AiNote>{DETAIL.aiNote}</AiNote>
    </VStack>
  );
}
