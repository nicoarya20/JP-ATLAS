// What both Inbox tabs share: a lane's loading and failure states, "Load more", and opening a card (which marks it read).
import { type Href, router } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { getInboxLane, type InboxCard, type InboxLane, type InboxLaneView } from '@/data/inbox';
import { inboxLaneResource, loadMoreInbox, markInboxRead } from '@/data/inbox.api';

import { INBOX } from './inbox.strings';

/** A failure in the words it came with (the server's, for an API error). */
export const why = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** "Load more" under a lane while the server has another page; a failure is reported, the cards stay. */
function LoadMore({ lane }: { lane: InboxLane }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    const state = await loadMoreInbox(lane);
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return (
    <Button
      testID={`inbox-more-${lane}`}
      variant="outline"
      isDisabled={busy}
      accessibilityState={{ busy, disabled: busy }}
      onPress={press}
    >
      {busy && <ButtonSpinner />}
      <ButtonText>{INBOX.loadMore}</ButtonText>
    </Button>
  );
}

type LaneProps = { lane: InboxLane; children: (view: InboxLaneView) => ReactNode };

/** A lane's body: loading, failed with "Try again", or `children` with the cards and "Load more" under them. */
export function Lane({ lane, children }: LaneProps) {
  const res = inboxLaneResource(lane);
  const state = res.use();
  const view = getInboxLane(lane);
  if (!view) {
    return state.phase === 'failed' ? (
      <FailedState
        testID={`inbox-failed-${lane}`}
        message={state.error?.message}
        onRetry={() => void res.reload()}
      />
    ) : (
      <LoadingState testID={`inbox-loading-${lane}`} />
    );
  }
  return (
    <>
      {children(view)}
      {view.more && <LoadMore lane={lane} />}
    </>
  );
}

/**
 * Opens a card's screen and marks the card read on the way. The screen opens at once; the read is
 * a side effect, so a failure to record it is reported but does not stand between the person and
 * the task (map §2d).
 */
export function useOpenCard() {
  const notice = useNotice();
  return (card: InboxCard, href: Href) => {
    router.push(href);
    if (card.read) return;
    markInboxRead(card.id, card.lane).catch((e: unknown) => notice(INBOX.readFailed(why(e))));
  };
}
