// Users ① Approval (prototype users.approve.jsx): counts, search, the sign-ups waiting (`/api/admin/users?approval=
// pending`, oldest first), and what approval does.
import { UserCheck } from 'lucide-react-native';
import { useEffect } from 'react';

import { CountChips } from '@/components/form/chips';
import { SearchField } from '@/components/search/search-field';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { usersStatsResource } from '@/data/users.admin.api';
import { signUpCard } from '@/data/users.admin.view';

import { ApprovalCard } from './approval.cards';
import { InfoBox } from './info-box';
import { type UserAsk, useUserConfirm } from './users.confirm';
import { ListState, LoadMore, useUsersList } from './users.list';
import { APPROVAL, USERS } from './users.strings';

/** The counts row, from `/users/stats`; hidden until it is in. */
function Counts() {
  const stats = usersStatsResource.useSnapshot().data;
  useEffect(() => {
    void usersStatsResource.ensure();
  }, []);
  if (!stats) return null;
  return (
    <CountChips label={USERS.countsLabel} items={APPROVAL.chips(stats.pending, stats.banned)} />
  );
}

/** The Approval tab. */
export function ApprovalTab() {
  const { state, search, setSearch } = useUsersList('approval');
  const [dialog, ask] = useUserConfirm();
  const data = state.data;
  return (
    <>
      <Text className="text-subhead text-muted-foreground">{APPROVAL.intro}</Text>
      <VStack className="gap-2">
        <Counts />
        <SearchField placeholder={USERS.search} value={search} onChangeText={setSearch} />
      </VStack>
      <ListState tab="approval" state={state} />
      {data && (
        <VStack className="gap-4">
          <Text className="text-footnote font-semibold">{APPROVAL.waiting(data.total)}</Text>
          <List
            data={data.users.map(signUpCard)}
            search={data.search}
            onReset={() => setSearch('')}
            ask={ask}
          />
          <LoadMore tab="approval" data={data} />
        </VStack>
      )}
      <InfoBox title={APPROVAL.infoTitle} items={APPROVAL.info} />
      {dialog}
    </>
  );
}

/** The sign-ups, or why there are none: nobody waiting, or nobody matching the search. */
function List(p: {
  data: ReturnType<typeof signUpCard>[];
  search: string;
  onReset: () => void;
  ask: (a: UserAsk) => void;
}) {
  if (p.data.length) return p.data.map((u) => <ApprovalCard key={u.id} u={u} ask={p.ask} />);
  if (p.search.trim()) return <NoMatch title={USERS.noMatch} onReset={p.onReset} />;
  return (
    <EmptyState
      testID="approval-empty"
      icon={UserCheck}
      title={APPROVAL.empty.title}
      text={APPROVAL.empty.text}
    />
  );
}
