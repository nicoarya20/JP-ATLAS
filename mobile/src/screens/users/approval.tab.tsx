// Users ① Approval (prototype users.approve.jsx): counts, search, the sign-ups waiting, and what approval does.
import { useState } from 'react';

import { CountChips } from '@/components/form/chips';
import { SearchField } from '@/components/search/search-field';
import { NoMatch } from '@/components/state/no-match';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { PendingUser } from '@/data/sample/users';
import { getApproval } from '@/data/users';
import { PendingCard, RejectingCard } from './approval.cards';
import { InfoBox } from './info-box';
import { useUserConfirm } from './users.confirm';
import { APPROVAL, USERS } from './users.strings';

const matches = (u: PendingUser, q: string) =>
  `${u.full} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase());

/** The Approval tab. */
export function ApprovalTab() {
  const d = getApproval();
  const [search, setSearch] = useState('');
  const [dialog, ask] = useUserConfirm();
  const pending = matches(d.pending, search);
  const rejecting = matches(d.rejecting, search);
  return (
    <>
      <Text className="text-subhead text-muted-foreground">{APPROVAL.intro}</Text>
      <VStack className="gap-2">
        <CountChips items={d.chips} />
        <SearchField placeholder={USERS.search} value={search} onChangeText={setSearch} />
      </VStack>
      <VStack className="gap-4">
        <Text className="text-footnote font-semibold">{d.waiting}</Text>
        {pending && <PendingCard u={d.pending} ask={ask} />}
        {rejecting && <RejectingCard u={d.rejecting} ask={ask} draft={d.reasonDraft} />}
        {!pending && !rejecting && <NoMatch title={USERS.noMatch} onReset={() => setSearch('')} />}
      </VStack>
      <InfoBox title={APPROVAL.infoTitle} items={APPROVAL.info} />
      {dialog}
    </>
  );
}
