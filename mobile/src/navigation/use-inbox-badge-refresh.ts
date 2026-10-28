// Keeps the Inbox badge numbers (More tile, Profile row, Home chip) current without polling: the count is asked again
// when the app comes back to the foreground and each time the More panel unfolds. Mounted once, with the More panel's
// open state, by MorePanelProvider above the tabs, which only exist while someone is signed in.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { inboxCountResource } from '@/data/inbox.api';

/** Re-asks the Inbox count on return to the foreground and when `moreOpen` turns true. */
export function useInboxBadgeRefresh(moreOpen: boolean): void {
  // What the app was last; unknown (null) until the first change, and only a change to `active` counts.
  const last = useRef<string | null>(AppState.currentState ?? null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const back = next === 'active' && last.current !== 'active';
      last.current = next;
      // invalidate() leaves a count nobody asked for yet alone; the first screen showing it fetches it.
      if (back) inboxCountResource.invalidate();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (moreOpen) inboxCountResource.invalidate();
  }, [moreOpen]);
}
