import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useNotice } from '@/components/notice/use-notice';
import { VStack } from '@/components/ui/vstack';
import { getHome } from '@/data/home';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { S } from './home.strings';
import { type OpenTarget, tabFor } from './home.targets';
import { HomeSearch, HomeStats, HomeTitle } from './parts/home-header';
import { AgendaSection } from './sections/agenda.section';
import { AskSection } from './sections/ask.section';
import { BriefingSection } from './sections/briefing.section';
import { FocusSection } from './sections/focus.section';
import { ActivitySection, DoneSection } from './sections/lists.section';

type HomeScreenProps = {
  /** Who is signed in; Phase 0 has no sign-in, so it comes from the session constant. */
  role?: Role;
  /** Where a Home element leads; by default the tab that will hold that screen. */
  onOpen?: (target: OpenTarget) => void;
};

function openTab(target: OpenTarget) {
  const href = tabFor(target);
  if (href) router.navigate(href);
}

/**
 * Home ①, ported 1:1 from the prototype: greeting, search, pinned stat chips, then Daily Briefing, My Focus, Ask Data,
 * Agenda & Projects, completed tasks and activity. Everything comes from getHome (the API swap point).
 */
export function HomeScreen({ role = SESSION_ROLE, onOpen = openTab }: HomeScreenProps) {
  const [completed, setCompleted] = useState<number[]>([]);
  const notice = useNotice();
  const data = getHome(role, { completed });

  const open = (target: OpenTarget) => {
    if (tabFor(target) === null) notice(S.searchLater);
    else onOpen(target);
  };
  const markDone = (no: number) => {
    setCompleted((done) => [...done, no]);
    notice(S.focus.markedDone);
  };

  return (
    <View className="flex-1 bg-card pt-safe">
      <HomeTitle greeting={data.greeting} me={data.me} />
      <ScrollView stickyHeaderIndices={[1]} className="flex-1">
        <HomeSearch onPress={() => open('home.search')} />
        <HomeStats stats={data.stats} onOpen={open} />
        <VStack className="gap-4 bg-background px-4 pb-8">
          <BriefingSection briefing={data.briefing} />
          <FocusSection focus={data.focus} onOpen={open} onDone={markDone} />
          <AskSection ask={data.ask} onAsk={() => notice(S.ask.answered)} />
          <AgendaSection agenda={data.agenda} onOpen={open} />
          <DoneSection done={data.done} onOpen={open} />
          <ActivitySection activity={data.activity} />
        </VStack>
      </ScrollView>
    </View>
  );
}
