import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';

import { isApiError } from '@/api/errors';
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { useNotice } from '@/components/notice/use-notice';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Pressable } from '@/components/ui/pressable';
import { getHome } from '@/data/home';
import { runFocusAction } from '@/data/home.actions';
import { homeResource } from '@/data/home.api';
import type { FocusTask } from '@/data/home.types';
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
  /** Where a Home chip or link leads; by default the router goes there. */
  onOpen?: (href: Href) => void;
};

const go = (href: Href) => router.navigate(href);

/**
 * Home ①: the greeting, my avatar, search and the stat chips pinned under the header, then Daily
 * Briefing, My Focus, Ask Data, Agenda & Projects, completed tasks and activity.
 *
 * Everything comes from one `GET /api/app/home`, read out of the store by `getHome()`. Each card is a section of that payload, so a single failing query shows
 * "Try again" on its own card; only a payload that never arrived replaces the whole screen. The
 * signed-in role is not a prop any more: what Home may show is the server's answer, not the
 * screen's guess.
 */
export function HomeScreen({ onOpen = go }: HomeScreenProps) {
  const state = homeResource.use();
  const [line, setLine] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const notice = useNotice();

  // Idempotent by rule 1: the gate has usually asked for home already, and this adds no request.
  useEffect(() => {
    void homeResource.ensure();
  }, []);

  const data = getHome();
  const retry = () => {
    void homeResource.reload();
  };
  const search = () => notice(S.searchLater);

  const runAction = async (task: FocusTask) => {
    setBusyId(task.id);
    try {
      await runFocusAction(task);
      notice(task.action === 'complete' ? S.focus.markedDone : S.focus.started);
    } catch (failure) {
      notice(isApiError(failure) ? failure.message : S.focus.actionFailed);
    } finally {
      setBusyId(null);
    }
  };

  if (!data) {
    return (
      <StackedScreen testID="screen-home" title={S.title}>
        {state.phase === 'failed' ? (
          <FailedState testID="home-failed" message={state.error?.message} onRetry={retry} />
        ) : (
          <LoadingState testID="home-loading" />
        )}
      </StackedScreen>
    );
  }

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
      <BriefingSection briefing={data.briefing} onRetry={retry} />
      <FocusSection
        focus={data.focus}
        busyId={busyId}
        onOpen={onOpen}
        onAction={(task) => void runAction(task)}
        onRetry={retry}
      />
      <AskSection ask={data.ask} onRetry={retry} />
      <AgendaSection
        agenda={data.agenda}
        projects={data.projects}
        onOpen={onOpen}
        onRetry={retry}
      />
      <DoneSection done={data.done} onOpen={onOpen} onRetry={retry} />
      <ActivitySection activity={data.activity} onRetry={retry} />
    </StackedScreen>
  );
}
