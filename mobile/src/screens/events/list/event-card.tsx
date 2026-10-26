// Event card of the list (prototype events.list.jsx EventCard): time tile, title, range and place,
// type and status pills. Tap opens the event's detail. A screen reader hears the card as one button
// naming all of that.
//
// Two things the prototype drew are gone: the Repeat badge (recurrence is GAP-A4) and the
// View / Check results button (the whole recording → outcomes → results flow is GAP-A8). Both are
// listed in `mobile/docs/phase2-gap-disembunyikan.md`.
import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventCard as Card } from '@/data/events';
import { eventDate } from '@/data/events.shared';

import { spoken } from '../events.strings.added';

type EventCardProps = { card: Card; onOpen: (card: Card) => void };

/** One event; the whole card opens its detail. */
export function EventCard({ card, onOpen }: EventCardProps) {
  const e = card.event;
  const open = () => onOpen(card);
  const where = [e.range, e.place].filter(Boolean).join(' · ');
  return (
    <Pressable
      testID={`event-card-${e.id}`}
      accessibilityRole="button"
      accessibilityLabel={spoken(e.title, eventDate(e), e.range, e.place, e.type, card.status)}
      onPress={open}
      className="rounded-card border border-border bg-card p-3 data-[active=true]:bg-muted"
    >
      <HStack className="gap-3">
        <Text className="w-12 text-subhead font-semibold text-foreground">{card.when}</Text>
        <VStack className="min-w-0 flex-1 gap-2">
          <VStack className="gap-1">
            <Text className="text-headline font-semibold text-foreground">{e.title}</Text>
            <Text className="text-footnote text-muted-foreground">{where}</Text>
          </VStack>
          <HStack className="flex-wrap items-center gap-2">
            <Badge variant="outline">
              <BadgeText>{e.type}</BadgeText>
            </Badge>
            <StatusPill status={card.status} />
          </HStack>
        </VStack>
      </HStack>
    </Pressable>
  );
}
