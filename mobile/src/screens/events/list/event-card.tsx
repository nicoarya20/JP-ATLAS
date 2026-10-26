// Event card of the list (prototype events.list.jsx EventCard): time tile, title with its repeat badge, range and
// place, type and status pills, and View / Check results on a Done event. Tap opens eventHref. A screen reader hears the
// card as one button naming all of that; View / Check results is the card's named action, since both open one screen.
import { Repeat } from 'lucide-react-native';

import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventCard as Card } from '@/data/events';
import { eventDate } from '@/data/events.shared';

import { LIST } from '../events.strings';
import { spoken } from '../events.strings.added';

const RESULTS_ACTION = 'results';

type EventCardProps = { card: Card; onOpen: (card: Card) => void };

/** One event; the card and its results button open the same screen. */
export function EventCard({ card, onOpen }: EventCardProps) {
  const e = card.event;
  const open = () => onOpen(card);
  const results = card.results && (card.results === 'view' ? LIST.viewResults : LIST.checkResults);
  return (
    <Pressable
      testID={`event-card-${e.id}`}
      accessibilityRole="button"
      accessibilityLabel={spoken(
        e.title,
        eventDate(e),
        e.range,
        e.place,
        e.repeat,
        e.type,
        card.status,
      )}
      accessibilityActions={
        results ? [{ name: 'activate' }, { name: RESULTS_ACTION, label: results }] : undefined
      }
      onAccessibilityAction={open}
      onPress={open}
      className="rounded-card border border-border bg-card p-3 data-[active=true]:bg-muted"
    >
      <HStack className="gap-3">
        <Text className="min-w-12 text-subhead font-semibold text-foreground">{card.when}</Text>
        <VStack className="min-w-0 flex-1 gap-2">
          <VStack className="gap-1">
            <Text className="text-headline font-semibold text-foreground">{e.title}</Text>
            {e.repeat && (
              <HStack testID="event-repeat" className="items-center gap-1">
                <Icon as={Repeat} size="xs" className="text-muted-foreground" />
                <Text className="text-footnote text-muted-foreground">{e.repeat}</Text>
              </HStack>
            )}
            <Text className="text-footnote text-muted-foreground">
              {e.range} · {e.place}
            </Text>
          </VStack>
          <HStack className="flex-wrap items-center justify-between gap-2">
            <HStack className="gap-2">
              <Badge variant="outline">
                <BadgeText>{e.type}</BadgeText>
              </Badge>
              <StatusPill status={card.status} />
            </HStack>
            {results && (
              // Not a second stop for screen readers: the card offers it as its named action.
              <Button
                size="sm"
                variant="outline"
                onPress={open}
                accessible={false}
                focusable={false}
              >
                <ButtonText>{results}</ButtonText>
              </Button>
            )}
          </HStack>
        </VStack>
      </HStack>
    </Pressable>
  );
}
