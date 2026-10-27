// Inbox ① Needs your response and ③ All caught up (prototype inbox.respond.jsx).
import { Check } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonText } from '@/components/ui/button';
import type { RespondCard } from '@/data/inbox';
import { INBOX_EMPTY } from './inbox.strings';
import { InboxCard } from './inbox-card';

type RespondTabProps = { cards: readonly RespondCard[]; onUpdates: () => void };

/** The cards, or "All caught up" with a way to the latest updates. */
export function RespondTab({ cards, onUpdates }: RespondTabProps) {
  if (!cards.length) {
    return (
      <EmptyState
        testID="inbox-empty"
        icon={Check}
        title={INBOX_EMPTY.title}
        text={INBOX_EMPTY.text}
        action={
          <Button variant="outline" onPress={onUpdates}>
            <ButtonText>{INBOX_EMPTY.action}</ButtonText>
          </Button>
        }
      />
    );
  }
  return cards.map((c) => <InboxCard key={c.key} card={c} />);
}
