// Events ⑦c Step 3 "Tasks from this meeting" (prototype events.outcomes.jsx Step3): a PM or Admin fixes the AI drafts
// and confirms them, which creates the tasks and opens the event's confirmed results; a Member only reads and waits.
import { router } from 'expo-router';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import type { OutcomesData } from '@/data/events.results';
import { confirmOutcomes } from '@/data/events.store';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import type { DraftTask } from '@/data/sample/events.extra';

import { OUTCOMES } from '../events.strings.outcomes';
import { EventPage } from '../parts/event-page';
import { Box, Note } from '../parts/event-parts';
import { StepHead } from './step-head';
import { type DraftEdit, Drafts } from './step3-drafts';

/** Step 3 of the outcomes of `data.event`. */
export function Step3({ data, role }: { data: OutcomesData; role: Role }) {
  const notice = useNotice();
  const { event: e, minutes } = data;
  const [drafts, setDrafts] = useState<DraftTask[]>(() => minutes.tasks.map((t) => ({ ...t })));
  const counts = { decisions: minutes.decisions.length, info: minutes.info.length };
  if (data.readOnly) {
    return (
      <EventPage testID="screen-outcomes-3" title={OUTCOMES.title}>
        <StepHead n={3} />
        <HStack>
          <StatusPill status={OUTCOMES.waitingPill(e.creator)} />
        </HStack>
        <Box>
          <Text className="text-body font-semibold text-foreground">
            {OUTCOMES.waitingTitle(e.creator)}
          </Text>
          <Text className="text-subhead text-muted-foreground">{OUTCOMES.readOnly}</Text>
        </Box>
        <Drafts drafts={drafts} {...counts} />
      </EventPage>
    );
  }
  const n = drafts.length;
  const ok = drafts.every((t) => t.due);
  const edit: DraftEdit = {
    remove: (i) => setDrafts((d) => d.filter((_, j) => j !== i)),
    due: (i, due) => setDrafts((d) => d.map((t, j) => (j === i ? { ...t, due } : t))),
    discard: role === 'admin',
  };
  const create = () => {
    confirmOutcomes(e.id, drafts, me(role).name);
    notice(OUTCOMES.created(n));
    router.dismissTo(`/events/${e.id}`);
    router.push(`/events/${e.id}/results`);
  };
  const foot = (
    <>
      <Button isDisabled={!ok} onPress={create}>
        <ButtonText>{OUTCOMES.create(n)}</ButtonText>
      </Button>
      <Note>{OUTCOMES.goesInto(data.project)}</Note>
    </>
  );
  return (
    <EventPage testID="screen-outcomes-3" title={OUTCOMES.title} foot={foot}>
      <StepHead n={3} />
      <Text className="text-subhead text-foreground">{OUTCOMES.found(minutes.tasks.length)}</Text>
      <Drafts drafts={drafts} {...counts} edit={edit} />
    </EventPage>
  );
}
