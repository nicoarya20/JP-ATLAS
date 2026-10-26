// Inbox (prototype InboxScreen): back, "Inbox", the two tabs (route param `tab`), then the tab's
// content. Both lanes come from GET /api/app/inbox; each tab shows its own loading and failure state,
// so one failing lane does not blank the other.
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { Seg } from '@/components/form/seg';
import { DetailPage } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { getInbox, type InboxTab } from '@/data/inbox';
import {
  ensureInbox,
  type InboxPageWire,
  inboxActionResource,
  inboxInfoResource,
} from '@/data/inbox.api';
import type { ResourceState } from '@/data/resource';

import { INBOX } from './inbox.strings';
import { RespondTab } from './respond.tab';
import { UpdatesTab } from './updates.tab';

const TABS: readonly InboxTab[] = ['respond', 'updates'];

/** A tab's content once its lane is there; before that, why it is not. */
function Pane({
  state,
  onRetry,
  children,
}: {
  state: ResourceState<InboxPageWire>;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (state.data) return <>{children}</>;
  if (state.phase === 'failed')
    return (
      <FailedState
        testID="inbox-failed"
        message={state.error?.message}
        busy={state.phase !== 'failed'}
        onRetry={onRetry}
      />
    );
  return <LoadingState testID="inbox-loading" />;
}

/** The Inbox. */
export function InboxScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: InboxTab = params.tab === 'updates' ? 'updates' : 'respond';
  const action = inboxActionResource.use();
  const info = inboxInfoResource.use();
  // Idempotent by rule 1: pushing this route twice mounts it twice and still asks once.
  useEffect(() => {
    void ensureInbox();
  }, []);
  const data = getInbox();
  const show = (t: InboxTab) => router.setParams({ tab: t });
  return (
    <DetailPage testID="screen-inbox" title={INBOX.title} tabBar>
      <Seg
        testID="inbox-tabs"
        label={INBOX.tabs}
        lines={2}
        items={[INBOX.respondTab(data.respond.length), INBOX.updatesTab]}
        value={TABS.indexOf(tab)}
        onChange={(i) => show(TABS[i] ?? 'respond')}
      />
      {tab === 'respond' ? (
        <Pane state={action} onRetry={() => void inboxActionResource.reload()}>
          <RespondTab
            cards={data.respond}
            more={data.moreRespond}
            onUpdates={() => show('updates')}
          />
        </Pane>
      ) : (
        <Pane state={info} onRetry={() => void inboxInfoResource.reload()}>
          <UpdatesTab groups={data.updates} more={data.moreUpdates} />
        </Pane>
      )}
    </DetailPage>
  );
}
