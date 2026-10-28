// Agenda of the picked date (prototype events.calendar.jsx Agenda): "Thu, Oct 8 · 1 event", then a card per event by
// start time (time, title, type · status); none → "No events on this day." Each card is one button whose name adds
// the date, time range and place.
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventRow } from '@/data/events';

import { CALENDAR } from '../events.strings';
import { spoken } from '../events.strings.added';

type AgendaListProps = {
  date: string;
  items: readonly EventRow[];
  onOpen: (row: EventRow) => void;
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
      {items.map((row) => (
        <Pressable
          key={row.id}
          testID={`agenda-${row.id}`}
          accessibilityRole="button"
          accessibilityLabel={spoken(row.title, date, row.range, row.where, row.type, row.status)}
          onPress={() => onOpen(row)}
          className="rounded-card border border-border bg-card p-3 data-[active=true]:bg-muted"
        >
          <HStack className="gap-3">
            <Text className="min-w-12 text-subhead font-semibold text-foreground">{row.start}</Text>
            <VStack className="min-w-0 flex-1 gap-1">
              <Text className="text-headline font-semibold text-foreground">{row.title}</Text>
              <Text className="text-footnote text-muted-foreground">
                {row.type} · {row.status}
              </Text>
            </VStack>
          </HStack>
        </Pressable>
      ))}
    </VStack>
  );
}
