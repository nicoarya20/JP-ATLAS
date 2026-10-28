// Inbox ① Needs your response and ③ All caught up (prototype inbox.respond.jsx): the server's open work cards.
import { Check } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonText } from '@/components/ui/button';
import { Lane } from './inbox.lane';
import { INBOX_EMPTY } from './inbox.strings';
import { InboxCard } from './inbox-card';

/** The cards, or "All caught up" with a way to the latest updates. */
export function RespondTab({ onUpdates }: { onUpdates: () => void }) {
  return (
    <Lane lane="action">
      {({ cards }) =>
        cards.length ? (
          cards.map((c) => <InboxCard key={c.id} card={c} />)
        ) : (
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
        )
      }
    </Lane>
  );
}
