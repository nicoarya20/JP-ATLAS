// Events ⑦a–⑦c Meeting outcomes in 3 steps (prototype events.outcomes.jsx), route param `step`: 1 recording done → 2
// check the text → 3 tasks from the meeting. Nothing is created until Create tasks; a Member only reads Step 3 and waits
// for the creator. Confirming returns to the event's detail and opens its confirmed results.
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronRight, PenLine, Play, Upload } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';

import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getOutcomes, type OutcomesData } from '@/data/events.results';
import { useEventsState } from '@/data/events.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { OUTCOMES } from '../events.strings.outcomes';
import { EventMissing, EventPage } from '../parts/event-page';
import { Ai, AiNote, EvSec, Note, Two } from '../parts/event-parts';
import { STEPS, StepHead } from './step-head';
import { Step3 } from './step3';

function OutlineButton({
  icon,
  onPress,
  children,
}: {
  icon: typeof Play;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant="outline" onPress={onPress}>
      <ButtonIcon as={icon} />
      {children}
    </Button>
  );
}

function Step1({ data }: { data: OutcomesData }) {
  const notice = useNotice();
  const s = data.minutes;
  const step2 = () => router.push(`/events/${data.event.id}/outcomes/2`);
  return (
    <>
      <HStack className="items-center gap-3 rounded-card bg-muted p-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={OUTCOMES.play}
          onPress={() => notice(OUTCOMES.playing)}
          className="h-11 w-11 items-center justify-center rounded-full bg-atlas data-[active=true]:opacity-70"
        >
          <Icon as={Play} className="text-card" />
        </Pressable>
        <VStack className="flex-1 gap-1">
          <Text className="text-headline font-semibold text-foreground">
            {OUTCOMES.recordingLine(s.length)}
          </Text>
          <Note>{OUTCOMES.savedLine(s.saved)}</Note>
        </VStack>
      </HStack>
      <Button onPress={step2}>
        <ButtonText>{OUTCOMES.toText}</ButtonText>
        <Ai />
      </Button>
      <EvSec title={OUTCOMES.otherWays}>
        <OutlineButton icon={PenLine} onPress={step2}>
          <ButtonText>{OUTCOMES.typeMyself}</ButtonText>
        </OutlineButton>
        <OutlineButton icon={Camera} onPress={() => notice(OUTCOMES.photoNotice)}>
          <ButtonText>{OUTCOMES.photo}</ButtonText>
          <Ai />
        </OutlineButton>
        <OutlineButton icon={Upload} onPress={() => notice(OUTCOMES.uploadNotice)}>
          <ButtonText>{OUTCOMES.upload}</ButtonText>
        </OutlineButton>
      </EvSec>
      <AiNote>{OUTCOMES.step1Note}</AiNote>
    </>
  );
}

function Step2({ data }: { data: OutcomesData }) {
  const [text, setText] = useState(() => data.minutes.transcript.join('\n'));
  return (
    <>
      <Field
        label={OUTCOMES.minutes}
        multiline
        value={text}
        onChangeText={setText}
        testID="minutes-text"
      />
      <Note>{data.minutes.by}</Note>
    </>
  );
}

/** The outcomes step of the event in the route params `id` and `step`. */
export function OutcomesScreen({ role = SESSION_ROLE }: { role?: Role }) {
  useEventsState();
  const { id, step } = useLocalSearchParams<{ id: string; step: string }>();
  const notice = useNotice();
  const data = getOutcomes(role, id);
  const n = Math.min(Math.max(Number(step) || 1, 1), STEPS);
  if (!data) return <EventMissing />;
  if (n === 3) return <Step3 data={data} role={role} />;
  const foot =
    n === 2 ? (
      <>
        <Two wide>
          <Button
            variant="outline"
            onPress={() => {
              router.back();
              notice(OUTCOMES.draftSaved);
            }}
          >
            <ButtonText>{OUTCOMES.saveExit}</ButtonText>
          </Button>
          <Button onPress={() => router.push(`/events/${id}/outcomes/3`)}>
            <ButtonText>{OUTCOMES.next}</ButtonText>
            <ButtonIcon as={ChevronRight} />
          </Button>
        </Two>
        <Note>{OUTCOMES.nextNote}</Note>
      </>
    ) : undefined;
  return (
    <EventPage testID={`screen-outcomes-${n}`} title={OUTCOMES.title} foot={foot}>
      <StepHead n={n} />
      {n === 1 ? <Step1 data={data} /> : <Step2 data={data} />}
    </EventPage>
  );
}
