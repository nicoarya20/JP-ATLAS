// The list's groups (prototype events.list.jsx Groups): a heading per schedule or type group, its cards; nothing left
// after the filters and search → "No events match these filters." with Reset filters.
import { NoMatch } from '@/components/state/no-match';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventCard as Card, EventsListData } from '@/data/events';

import { LIST } from '../events.strings';
import { EventCard } from './event-card';

type EventGroupsProps = {
  groups: EventsListData['groups'];
  onOpen: (card: Card) => void;
  onReset: () => void;
};

/** Grouped cards, or the no-match state. */
export function EventGroups({ groups, onOpen, onReset }: EventGroupsProps) {
  if (!groups.length) return <NoMatch title={LIST.noMatch} onReset={onReset} />;
  return groups.map((g) => (
    <VStack key={g.title} className="gap-2">
      <Text accessibilityRole="header" className="text-footnote font-bold text-muted-foreground">
        {g.title}
      </Text>
      {g.data.map((card) => (
        <EventCard key={card.event.id} card={card} onOpen={onOpen} />
      ))}
    </VStack>
  ));
}
