// Users ① Approval (prototype users.approve.jsx): counts, search, the sign-ups waiting, and what approval does.
import { UserCheck } from 'lucide-react-native';
import { useState } from 'react';

import { CountChips } from '@/components/form/chips';
import { SearchField } from '@/components/search/search-field';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type ApprovalItem, getApproval, useDecisions } from '@/data/users';
import { ApprovalCard } from './approval.cards';
import { InfoBox } from './info-box';
import { type UserAsk, useUserConfirm } from './users.confirm';
import { APPROVAL, USERS } from './users.strings';

const matches = (u: ApprovalItem, q: string) =>
  `${u.full} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase());

/** The sign-ups matching the search, or why there are none. */
function List({
  people,
  search,
  onReset,
  ask,
}: {
  people: readonly ApprovalItem[];
  search: string;
  onReset: () => void;
  ask: (a: UserAsk) => void;
}) {
  if (!people.length)
    return (
      <EmptyState
        testID="approval-empty"
        icon={UserCheck}
        title={APPROVAL.empty.title}
        text={APPROVAL.empty.text}
      />
    );
  const shown = people.filter((u) => matches(u, search));
  if (!shown.length) return <NoMatch title={USERS.noMatch} onReset={onReset} />;
  return shown.map((u) => <ApprovalCard key={u.key} u={u} ask={ask} />);
}

/** The Approval tab. */
export function ApprovalTab() {
  const d = getApproval(useDecisions());
  const [search, setSearch] = useState('');
  const [dialog, ask] = useUserConfirm();
  return (
    <>
      <Text className="text-subhead text-muted-foreground">{APPROVAL.intro}</Text>
      <VStack className="gap-2">
        <CountChips items={d.chips} />
        <SearchField placeholder={USERS.search} value={search} onChangeText={setSearch} />
      </VStack>
      <VStack className="gap-4">
        <Text className="text-footnote font-semibold">{d.waiting}</Text>
        <List people={d.people} search={search} onReset={() => setSearch('')} ask={ask} />
      </VStack>
      <InfoBox title={APPROVAL.infoTitle} items={APPROVAL.info} />
      {dialog}
    </>
  );
}
