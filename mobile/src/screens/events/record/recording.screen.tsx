// Events ⑥ Recording (prototype events.record.jsx Recording): a static timer as in the prototype, Pause (a notice) and
// Stop recording, which opens Step 1 of the outcomes. The route turns the back swipe off (NO_SWIPE).
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';

import { useNotice } from '@/components/notice/use-notice';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { findEvent, useEventsState } from '@/data/events.store';

import { RECORD } from '../events.strings.outcomes';
import { EventMissing, EventPage } from '../parts/event-page';
import { Note, Two } from '../parts/event-parts';
import { MicDisc, RecordHead } from './record-ready.screen';

/** Recording the event in the route param `id`. */
export function RecordingScreen() {
  useEventsState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const e = findEvent(id);
  if (!e) return <EventMissing />;
  const foot = (
    <Two wide>
      <Button variant="outline" onPress={() => notice(RECORD.paused)}>
        <ButtonText>{RECORD.pause}</ButtonText>
      </Button>
      <Button onPress={() => router.push(`/events/${e.id}/outcomes/1`)}>
        <ButtonText>{RECORD.stop}</ButtonText>
      </Button>
    </Two>
  );
  return (
    <EventPage testID="screen-recording" title={RECORD.title} foot={foot}>
      <RecordHead e={e} />
      <VStack className="items-center gap-3 py-4">
        <MicDisc live />
        <StatusPill status={RECORD.recording} />
        <Text accessibilityRole="timer" className="text-metric font-bold text-foreground">
          {RECORD.timer}
        </Text>
        <HStack className="items-center gap-1">
          <Icon as={Check} size="sm" className="text-muted-foreground" />
          <Text className="text-footnote text-muted-foreground">{RECORD.told}</Text>
        </HStack>
      </VStack>
      <Note>{RECORD.keepOn}</Note>
    </EventPage>
  );
}
