/** Empty lanes: "Semua beres" with a way to the news (screen 3 of the wireframe), or "Belum ada kabar". */
import { FiCheckCircle, FiInbox } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import type { InboxLane } from '~/lib/inbox-api';
import { INBOX_COPY } from './inbox.copy';

export function InboxEmpty({ lane, onShowNews }: { lane: InboxLane; onShowNews: () => void }) {
  if (lane === 'action') {
    return (
      <EmptyState
        icon={FiCheckCircle}
        title={INBOX_COPY.emptyActionTitle}
        description={INBOX_COPY.emptyActionBody}
        action={{ label: INBOX_COPY.emptyActionButton, onClick: onShowNews }}
      />
    );
  }
  return (
    <EmptyState
      icon={FiInbox}
      title={INBOX_COPY.emptyInfoTitle}
      description={INBOX_COPY.emptyInfoBody}
    />
  );
}
