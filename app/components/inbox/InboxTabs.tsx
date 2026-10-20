/** The two Inbox tabs; "Perlu Anda tanggapi" carries the open-card count from the bell query. */
import { SegmentedControl } from '@mantine/core';
import type { InboxLane } from '~/lib/inbox-api';
import { INBOX_COPY } from './inbox.copy';

type Props = { lane: InboxLane; actionCount: number; onChange: (lane: InboxLane) => void };

export function InboxTabs({ lane, actionCount, onChange }: Props) {
  return (
    <SegmentedControl
      aria-label={INBOX_COPY.tabsLabel}
      value={lane}
      onChange={(v) => onChange(v as InboxLane)}
      data={[
        { value: 'action', label: INBOX_COPY.tabAction(actionCount) },
        { value: 'info', label: INBOX_COPY.tabInfo },
      ]}
      // Phone: the two tabs share the width and the label may wrap (a larger text size must not push the row past 375 px).
      w={{ base: '100%', sm: 'auto' }}
      styles={{ label: { whiteSpace: 'normal', lineHeight: 1.25 } }}
    />
  );
}
