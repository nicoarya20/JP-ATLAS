// Inbox (prototype InboxScreen): back, "Inbox", the two tabs (route param `tab`), then the tab's content. The tab bar
// stays, as on every More screen it opens.
import { router, useLocalSearchParams } from 'expo-router';

import { Seg } from '@/components/form/seg';
import { DetailPage } from '@/components/screen/detail-page';
import { getInbox, type InboxTab } from '@/data/inbox';
import { useAllRead } from '@/data/inbox.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { INBOX } from './inbox.strings';
import { RespondTab } from './respond.tab';
import { UpdatesTab } from './updates.tab';

const TABS: readonly InboxTab[] = ['respond', 'updates'];

/** The Inbox. role: who is signed in (K12). */
export function InboxScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: InboxTab = params.tab === 'updates' ? 'updates' : 'respond';
  const data = getInbox(role, useAllRead());
  const show = (t: InboxTab) => router.setParams({ tab: t });
  return (
    <DetailPage testID="screen-inbox" title={INBOX.title} tabBar>
      <Seg
        items={[INBOX.respondTab(data.respond.length), INBOX.updatesTab]}
        value={TABS.indexOf(tab)}
        onChange={(i) => show(TABS[i] ?? 'respond')}
      />
      {tab === 'respond' ? (
        <RespondTab cards={data.respond} onUpdates={() => show('updates')} />
      ) : (
        <UpdatesTab days={data.updates} />
      )}
    </DetailPage>
  );
}
