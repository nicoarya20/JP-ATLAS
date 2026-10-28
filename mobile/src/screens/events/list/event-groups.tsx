// The list's groups (prototype events.list.jsx Groups): a heading per schedule or type group, then its cards.
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventCard as Card, EventsListView } from '@/data/events';

import { EventCard } from './event-card';

type EventGroupsProps = { groups: EventsListView['groups']; onOpen: (card: Card) => void };

/** Grouped cards. */
export function EventGroups({ groups, onOpen }: EventGroupsProps) {
  return groups.map((g) => (
    <VStack key={g.title} className="gap-2">
      <Text accessibilityRole="header" className="text-footnote font-bold text-muted-foreground">
        {g.title}
      </Text>
      {g.data.map((card) => (
        <EventCard key={card.id} card={card} onOpen={onOpen} />
      ))}
    </VStack>
  ));
}
