// Team ① list and ③ empty: who the server says is on my team. Search and order are the server's
// query (`?q`, `?sort`), not a filter over one page — a client-side search would only have searched
// the people that happened to be loaded.
import { Users } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';

import { Chips } from '@/components/form/chips';
import { Rows } from '@/components/list/rows';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { SearchField } from '@/components/search/search-field';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { Role } from '@/data/sample';
import { getTeam, type TeamQuery } from '@/data/team';
import { TEAM_SORTS, teamList } from '@/data/team.api';
import { ensureWhoami, whoamiResource, whoamiRole } from '@/data/whoami.api';

import { PersonRow } from './person-row';
import { TEAM, TEAM_EMPTY } from './team.strings';

/** How long the field waits before asking the server, so typing is not a request per keystroke. */
const SEARCH_DELAY_MS = 350;

type TeamScreenProps = {
  /** Who is signed in; the server's own answer by default, a prop so a test can render any role. */
  role?: Role;
};

/** The Team list. */
export function TeamScreen({ role }: TeamScreenProps) {
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(0);
  // The role decides copy only (which closing note), so whoami failing costs a sentence, not a screen.
  whoamiResource.use();
  useEffect(() => {
    void ensureWhoami();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setQ(typed), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);
  const query = useMemo<TeamQuery>(() => ({ q, sort: TEAM_SORTS[sort] ?? 'name' }), [q, sort]);
  const list = teamList(query);
  const state = list.use();
  // Idempotent by rule 1: `ensure()` fetches only what is not fresh, so every mount may ask.
  useEffect(() => {
    void list.ensure();
  }, [list]);
  const data = getTeam(query, role ?? whoamiRole());
  const reset = () => {
    setTyped('');
    setQ('');
    setSort(0);
  };
  const body = () => {
    if (state.phase === 'failed' && !data) {
      // The server's own sentence, as it came (K5). `sort=active|overdue` answers 422
      // SORT_NOT_ALLOWED to a caller with no right to anyone else's numbers, and that sentence
      // explains it better than anything this app could add.
      return (
        <FailedState
          testID="team-failed"
          message={state.error?.message}
          onRetry={() => void list.reload()}
        />
      );
    }
    if (!data) return <LoadingState testID="team-loading" />;
    if (data.total === 0) {
      return q ? (
        <NoMatch title={TEAM.noMatch} onReset={reset} />
      ) : (
        <EmptyState
          testID="team-empty"
          icon={Users}
          iconLabel={TEAM_EMPTY.icon}
          title={TEAM_EMPTY.title}
          text={TEAM_EMPTY.text}
        />
      );
    }
    return (
      <>
        <SectionCard>
          <Text className="text-subhead">{data.summary}</Text>
        </SectionCard>
        <Rows testID="team-rows">
          {data.people.map((o) => (
            <PersonRow key={o.key} o={o} />
          ))}
        </Rows>
        {data.hasMore && (
          <Button
            testID="team-more"
            variant="outline"
            isDisabled={state.phase === 'loading'}
            accessibilityLabel={TEAM.moreLabel(data.people.length, data.total)}
            accessibilityState={{ busy: state.phase === 'loading' }}
            onPress={() => void list.more()}
          >
            {state.phase === 'loading' && <ButtonSpinner />}
            <ButtonText>{TEAM.more}</ButtonText>
          </Button>
        )}
        {data.note && <Text className="text-footnote text-muted-foreground">{data.note}</Text>}
      </>
    );
  };
  return (
    <DetailPage testID="screen-team" title={TEAM.title} tabBar>
      <Text className="text-subhead text-muted-foreground">{TEAM.intro}</Text>
      <Chips items={TEAM.sorts} value={sort} onChange={setSort} label={TEAM.sortLabel} />
      <SearchField placeholder={TEAM.search} value={typed} onChangeText={setTyped} keep />
      {body()}
    </DetailPage>
  );
}
