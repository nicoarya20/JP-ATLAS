// Event card of the list (prototype events.list.jsx EventCard): time tile, title, range and place, type and status
// pills, and the minutes' state once there are minutes. Tap opens the event. A screen reader hears the card as one
// button naming all of that. Repeat and "View results" are hidden: the server has neither yet (E-1, E-2).
import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventCard as Card } from '@/data/events';

import { spoken } from '../events.strings.added';

type EventCardProps = { card: Card; onOpen: (card: Card) => void };

/** One event. */
export function EventCard({ card, onOpen }: EventCardProps) {
  return (
    <Pressable
      testID={`event-card-${card.id}`}
      accessibilityRole="button"
      accessibilityLabel={spoken(
        card.title,
        card.day,
        card.range,
        card.where,
        card.type,
        card.status,
        card.note,
      )}
      onPress={() => onOpen(card)}
      className="rounded-card border border-border bg-card p-3 data-[active=true]:bg-muted"
    >
      <HStack className="gap-3">
        <Text className="min-w-12 text-subhead font-semibold text-foreground">{card.when}</Text>
        <VStack className="min-w-0 flex-1 gap-2">
          <VStack className="gap-1">
            <Text className="text-headline font-semibold text-foreground">{card.title}</Text>
            <Text className="text-footnote text-muted-foreground">
              {card.range} · {card.where}
            </Text>
          </VStack>
          <HStack className="flex-wrap items-center gap-2">
            <Badge variant="outline">
              <BadgeText>{card.type}</BadgeText>
            </Badge>
            <StatusPill status={card.status} />
            {card.note && (
              <Text testID="event-note" className="text-footnote text-muted-foreground">
                {card.note}
              </Text>
            )}
          </HStack>
        </VStack>
      </HStack>
    </Pressable>
  );
}
