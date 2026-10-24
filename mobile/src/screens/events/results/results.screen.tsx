// Events ⑨ detail with confirmed results (prototype events.confirmed.jsx DetailConfirmed): the kickoff sample or what
// Step 3 confirmed. Created tasks read live from Tasks (status, owner, due); one Tasks no longer has opens All tasks.
// Tasks go to the project, decisions to its history, open questions to the next meeting's agenda. No ⋯ menu.
import { router, useLocalSearchParams } from 'expo-router';

import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { monthDay } from '@/data/dates';
import { getEventResults, type MadeTask } from '@/data/events.results';
import { eventDate, eventWhere } from '@/data/events.shared';
import { useEventsState } from '@/data/events.store';
import { useTasks } from '@/data/tasks.store';
import { routeHref } from '@/navigation/route-href';

import { RESULTS } from '../events.strings.outcomes';
import { EventMissing, EventPage } from '../parts/event-page';
import { Box, Bullets, EvHead, EvSec, Note } from '../parts/event-parts';

// The task detail route lands with Tasks (Sesi D); routeHref until then.
const taskHref = (t: MadeTask) => routeHref(t.exists ? `/tasks/${t.no}` : '/tasks?scope=all');

function Made({ t }: { t: MadeTask }) {
  const label = `#${t.no} ${t.title}`;
  return (
    <Pressable
      testID={`made-task-${t.no}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(taskHref(t))}
      className="rounded-card bg-card p-3 data-[active=true]:opacity-70"
    >
      <HStack className="items-start justify-between gap-2">
        <VStack className="flex-1 gap-1">
          <Text className="text-headline font-semibold text-foreground">{label}</Text>
          {t.who && (
            <Text className="text-footnote text-muted-foreground">
              {RESULTS.taskLine(t.who, t.due ? monthDay(t.due) : '')}
            </Text>
          )}
        </VStack>
        <StatusPill status={t.status} />
      </HStack>
    </Pressable>
  );
}

/** The confirmed results of the event in the route param `id`. */
export function EventResultsScreen() {
  useEventsState();
  useTasks((s) => s);
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = getEventResults(id);
  if (!r) return <EventMissing />;
  const e = r.event;
  return (
    <EventPage testID="screen-results" title={RESULTS.title}>
      <EvHead title={e.title}>
        <StatusPill status={RESULTS.done} />
        <Badge variant="outline">
          <BadgeText>{e.type}</BadgeText>
        </Badge>
        <StatusPill status={RESULTS.confirmedPill(r.tasks.length, r.done)} />
      </EvHead>
      <VStack className="gap-1">
        <Text className="text-subhead text-foreground">{`${eventDate(e)} · ${e.range}`}</Text>
        <Text className="text-subhead text-foreground">{`${eventWhere(e)} · ${r.project}`}</Text>
        <Text className="text-subhead text-foreground">
          {RESULTS.attendees(e.attendees.join(', '))}
        </Text>
      </VStack>
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-headline font-semibold text-foreground">
          {RESULTS.heading}
        </Text>
        <Note>{r.confirmed}</Note>
      </VStack>
      <EvSec title={RESULTS.tasks(r.tasks.length)}>
        {r.tasks.map((t) => (
          <Made key={t.no} t={t} />
        ))}
        <Note>{r.tasks.length ? RESULTS.tapTask : RESULTS.noTasks}</Note>
      </EvSec>
      <EvSec title={RESULTS.decisions(r.decisions.length)}>
        <Bullets items={r.decisions} />
      </EvSec>
      <EvSec title={RESULTS.info(r.info.length)}>
        <Bullets items={r.info} />
      </EvSec>
      <EvSec title={RESULTS.questions}>
        <Box>
          <Text className="text-body font-semibold text-foreground">{r.question.text}</Text>
          <Note>{r.question.meta}</Note>
        </Box>
      </EvSec>
      <EvSec title={RESULTS.minutes} tag={<StatusPill status={RESULTS.confirmed} />}>
        <VStack className="gap-2 rounded-card bg-card p-3">
          {r.source.map((line) => (
            <Note key={line}>{line}</Note>
          ))}
          <Text className="text-subhead text-foreground">{r.minutes}</Text>
        </VStack>
        <Button variant="outline" onPress={() => router.push(`/events/${e.id}/outcomes/2`)}>
          <ButtonText>{RESULTS.fullMinutes}</ButtonText>
        </Button>
      </EvSec>
    </EventPage>
  );
}
