// Team ① list and ③ empty (prototype team.list.jsx): the people I share projects with, from `GET /api/app/team`. Search
// and sort are the server's (`?q=`, `?sort=`); the project picker is hidden until Projects reads the server (G2-TPA2).
import { Users } from 'lucide-react-native';
import { useEffect } from 'react';

import { Seg } from '@/components/form/seg';
import { Rows } from '@/components/list/rows';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { SearchField } from '@/components/search/search-field';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Text } from '@/components/ui/text';
import { getTeam } from '@/data/team';
import { getTeamQuery, TEAM_SEARCH_MAX, teamResource } from '@/data/team.api';

import { PersonRow } from './person-row';
import { LoadMore, useTeamControls } from './team.controls';
import { TEAM, TEAM_EMPTY } from './team.strings';

/** The Team list. */
export function TeamScreen() {
  const state = teamResource.useSnapshot();
  const data = getTeam();
  const { search, setSearch, sortBy, pending } = useTeamControls();

  useEffect(() => {
    void teamResource.ensure();
  }, []);

  if (!data) {
    return (
      <DetailPage testID="screen-team" title={TEAM.title} tabBar>
        {state.phase === 'failed' ? (
          <FailedState
            testID="team-failed"
            message={state.error?.message}
            onRetry={() => void teamResource.reload()}
          />
        ) : (
          <LoadingState testID="team-loading" />
        )}
      </DetailPage>
    );
  }
  const searching = getTeamQuery().q.trim() !== '';
  if (!data.total && !searching) {
    return (
      <DetailPage testID="screen-team" title={TEAM.title} tabBar>
        <EmptyState
          testID="team-empty"
          icon={Users}
          iconLabel={TEAM_EMPTY.icon}
          title={TEAM_EMPTY.title}
          text={TEAM_EMPTY.text}
        />
      </DetailPage>
    );
  }
  const sort = getTeamQuery().sort;
  return (
    <DetailPage testID="screen-team" title={TEAM.title} tabBar>
      <Text className="text-subhead text-muted-foreground">{TEAM.intro}</Text>
      {data.sorts.length > 1 && (
        <Seg
          testID="team-sort"
          kind="radio"
          label={TEAM.sort}
          items={data.sorts.map((s) => TEAM.sorts[s])}
          value={Math.max(0, data.sorts.indexOf(sort))}
          onChange={(i) => void sortBy(data.sorts[i] ?? 'name')}
        />
      )}
      <SearchField
        placeholder={TEAM.search}
        value={search}
        onChangeText={(v) => setSearch(v.slice(0, TEAM_SEARCH_MAX))}
      />
      <SectionCard>
        <Text className="text-subhead">{data.summary}</Text>
      </SectionCard>
      {pending && <LoadingState testID="team-refreshing" />}
      {state.phase === 'failed' && state.error && (
        <Text testID="team-error" className="text-footnote text-destructive">
          {state.error.message}
        </Text>
      )}
      {data.people.length ? (
        <Rows testID="team-rows">
          {data.people.map((o) => (
            <PersonRow key={o.id} o={o} />
          ))}
        </Rows>
      ) : (
        <NoMatch title={TEAM.noMatch} onReset={() => setSearch('')} />
      )}
      {data.more && <LoadMore shown={data.people.length} total={data.total} />}
      {data.note && <Text className="text-footnote text-muted-foreground">{data.note}</Text>}
    </DetailPage>
  );
}
