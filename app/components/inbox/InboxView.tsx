/** The Inbox page body: header, the two tabs and the list of the open tab; all data comes from the loader seed and the polled queries. */
import { Group } from '@mantine/core';
import { useSearchParams } from 'react-router';
import { LeaveRejectModal } from '~/components/leave/LeaveRejectModal';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { type InboxLane, type InboxSeed, laneFromTab } from '~/lib/inbox-api';
import type { InboxClock } from '~/lib/inbox-view';
import { useInboxCounts } from '~/lib/use-inbox';
import { useNow } from '~/lib/use-now';
import { InboxList } from './InboxList';
import { InboxTabs } from './InboxTabs';
import { INBOX_COPY } from './inbox.copy';
import { MarkAllReadButton } from './MarkAllReadButton';
import { useInboxActions } from './useInboxActions';
import { useInboxLeave } from './useInboxLeave';

export type InboxViewProps = { seed: InboxSeed; timeZone: string };

export function InboxView({ seed, timeZone }: InboxViewProps) {
  const [params, setParams] = useSearchParams();
  const lane = laneFromTab(params.get('tab'));
  const counts = useInboxCounts(seed).data ?? seed.counts;
  const clock: InboxClock = { now: useNow(seed.loadedAt), timeZone };
  const actions = useInboxActions();
  const leave = useInboxLeave(() => void actions.refresh());

  const show = (next: InboxLane) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'info') nextParams.set('tab', 'info');
    else nextParams.delete('tab');
    setParams(nextParams);
  };

  return (
    <PageContainer>
      <PageHeader title={INBOX_COPY.title} description={INBOX_COPY.description} />
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <InboxTabs lane={lane} actionCount={counts.action} onChange={show} />
        {lane === 'info' && (
          <MarkAllReadButton
            unread={counts.infoUnread}
            loading={actions.markingAll}
            onClick={actions.markAllRead}
          />
        )}
      </Group>
      <InboxList
        lane={lane}
        seed={seed}
        clock={clock}
        approvingId={leave.approvingId}
        onOpen={actions.openCard}
        onApprove={leave.approve}
        onReject={leave.reject}
        onShowNews={() => show('info')}
      />
      <LeaveRejectModal
        item={leave.rejecting}
        onClose={leave.closeReject}
        onDone={() => void actions.refresh()}
      />
    </PageContainer>
  );
}
