import { type Href, router } from 'expo-router';
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { useNotice } from '@/components/notice/use-notice';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { Pressable } from '@/components/ui/pressable';
import { useEventsState } from '@/data/events.store';
import { getHome } from '@/data/home';
import { markFocusDone } from '@/data/home.actions';
import { useProjectsState } from '@/data/projects.state';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { useTasks } from '@/data/tasks.state';
import { useDecisions } from '@/data/users';
import { PROFILE_PATH } from '@/screens/more/more.tiles';

import { S } from './home.strings';
import { HomeSearch, HomeStats } from './parts/home-header';
import { statFold } from './parts/stat-chip';
import { AgendaSection } from './sections/agenda.section';
import { AskSection } from './sections/ask.section';
import { BriefingSection } from './sections/briefing.section';
import { FocusSection } from './sections/focus.section';
import { ActivitySection, DoneSection } from './sections/lists.section';

type HomeScreenProps = {
  /** Who is signed in; Phase 1 has no sign-in, so it comes from the session constant. */
  role?: Role;
  /** Where a Home chip or link leads; by default the router goes there. */
  onOpen?: (href: Href) => void;
};

const go = (href: Href) => router.navigate(href);

/**
 * Home ①, ported 1:1 from the prototype (home.main): a StackedScreen with the greeting, my avatar (it opens my
 * profile), search and the stat chips pinned under the header, then Daily Briefing, My Focus, Ask Data, Agenda &
 * Projects, completed tasks and activity. Everything comes from getHome (the API swap point) on the live task and
 * event stores, so a change made in Tasks or Events, or Done here, shows at once.
 */
export function HomeScreen({ role = SESSION_ROLE, onOpen = go }: HomeScreenProps) {
  const tasks = useTasks((s) => s);
  const events = useEventsState();
  const [line, setLine] = useState(0);
  const notice = useNotice();
  const projects = useProjectsState();
  const decisions = useDecisions();
  const data = getHome(role, { tasks, events, projects, decisions });

  const search = () => notice(S.searchLater);
  const markDone = (no: number) => {
    markFocusDone(role, no);
    notice(S.focus.markedDone);
  };

  return (
    <StackedScreen
      testID="screen-home"
      title={S.greeting(data.greeting, data.me.name)}
      aside={
        // Same as the More panel's profile card: my avatar opens the profile overlay from below.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={S.openProfile(data.me.full)}
          onPress={() => onOpen(PROFILE_PATH)}
          className="h-11 w-11 items-center justify-center data-[active=true]:scale-[0.94]"
        >
          <PersonAvatar name={data.me.name} />
        </Pressable>
      }
      find={<HomeSearch onPress={search} />}
      onFind={search}
      pinned={<HomeStats stats={data.stats} line={line} onLine={setLine} onOpen={onOpen} />}
      pinnedShrink={statFold(line)}
    >
      <BriefingSection briefing={data.briefing} />
      <FocusSection focus={data.focus} onOpen={onOpen} onDone={markDone} />
      <AskSection ask={data.ask} onAsk={() => notice(S.ask.answered)} />
      <AgendaSection agenda={data.agenda} onOpen={onOpen} />
      <DoneSection done={data.done} onOpen={onOpen} />
      <ActivitySection activity={data.activity} />
    </StackedScreen>
  );
}
