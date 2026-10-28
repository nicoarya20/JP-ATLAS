// Inbox (prototype InboxScreen): back, "Inbox", the two tabs (route param `tab`), then the tab's lane. The tab bar
// stays, as on every More screen it opens.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Seg } from '@/components/form/seg';
import { DetailPage } from '@/components/screen/detail-page';
import { type InboxLane, inboxCountResource, inboxLaneResource } from '@/data/inbox.api';

import { INBOX } from './inbox.strings';
import { RespondTab } from './respond.tab';
import { UpdatesTab } from './updates.tab';

type InboxTab = 'respond' | 'updates';
const TABS: readonly InboxTab[] = ['respond', 'updates'];
const LANE: Record<InboxTab, InboxLane> = { respond: 'action', updates: 'info' };

/** The Inbox: the work queue and the news lane, both from `/api/app/inbox`. */
export function InboxScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: InboxTab = params.tab === 'updates' ? 'updates' : 'respond';
  const count = inboxCountResource.use().data;
  const show = (t: InboxTab) => router.setParams({ tab: t });

  // Idempotent (pattern rule 1): a lane already loaded is not fetched again when its tab returns.
  useEffect(() => {
    void inboxCountResource.ensure();
  }, []);
  useEffect(() => {
    void inboxLaneResource(LANE[tab]).ensure();
  }, [tab]);

  return (
    <DetailPage testID="screen-inbox" title={INBOX.title} tabBar>
      <Seg
        testID="inbox-tabs"
        label={INBOX.tabs}
        lines={2}
        items={[INBOX.respondTab(count?.action ?? null), INBOX.updatesTab]}
        value={TABS.indexOf(tab)}
        onChange={(i) => show(TABS[i] ?? 'respond')}
      />
      {tab === 'respond' ? (
        <RespondTab onUpdates={() => show('updates')} />
      ) : (
        <UpdatesTab infoUnread={count?.infoUnread ?? null} />
      )}
    </DetailPage>
  );
}
