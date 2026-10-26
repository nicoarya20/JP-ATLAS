// Agenda of the picked date (prototype events.calendar.jsx Agenda): "Thu, Oct 8 · 1 event", then a card per event by
// start time (time, title, type · status); none → "No events on this day." Each card is one button whose name adds
// the date, time range and place.
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { AgendaItem } from '@/data/events';

import { CALENDAR } from '../events.strings';
import { spoken } from '../events.strings.added';

type AgendaListProps = {
  date: string;
  items: readonly AgendaItem[];
  onOpen: (item: AgendaItem) => void;
};

/** Heading and the picked date's events. */
export function AgendaList({ date, items, onOpen }: AgendaListProps) {
  return (
    <VStack className="gap-2">
      <Text
        testID="agenda-head"
        accessibilityRole="header"
        className="text-footnote font-bold text-muted-foreground"
      >
        {CALENDAR.agendaHead(date, items.length)}
      </Text>
      {items.length === 0 && (
        <Text className="text-footnote text-muted-foreground">{CALENDAR.noEvents}</Text>
      )}
      {items.map((item) => (
        <Pressable
          key={item.event.id}
          accessibilityRole="button"
          accessibilityLabel={spoken(
            item.event.title,
            date,
            item.event.range,
            item.event.place,
            item.event.type,
            item.status,
          )}
          onPress={() => onOpen(item)}
          className="rounded-card border border-border bg-card p-3 data-[active=true]:bg-muted"
        >
          <HStack className="gap-3">
            <Text className="min-w-12 text-subhead font-semibold text-foreground">
              {item.event.time}
            </Text>
            <VStack className="min-w-0 flex-1 gap-1">
              <Text className="text-headline font-semibold text-foreground">
                {item.event.title}
              </Text>
              <Text className="text-footnote text-muted-foreground">
                {item.event.type} · {item.status}
              </Text>
            </VStack>
          </HStack>
        </Pressable>
      ))}
    </VStack>
  );
}
