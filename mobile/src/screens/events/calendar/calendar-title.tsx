// Month / week title between its arrows (prototype events.calendar.jsx Title): "October 2026" or "Oct 5 – 11".
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { CalendarView } from '@/data/events';

import { CALENDAR } from '../events.strings';

type CalendarTitleProps = { view: CalendarView; title: string; onStep: (by: number) => void };

function Arrow({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: typeof ChevronLeft;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full data-[active=true]:bg-muted"
    >
      <Icon as={icon} size="xl" className="text-atlas" />
    </Pressable>
  );
}

/** The arrows step a month or a week. */
export function CalendarTitle({ view, title, onStep }: CalendarTitleProps) {
  return (
    <HStack className="items-center justify-between">
      <Arrow label={CALENDAR.previous(view)} icon={ChevronLeft} onPress={() => onStep(-1)} />
      <Text accessibilityRole="header" className="text-headline font-semibold text-foreground">
        {title}
      </Text>
      <Arrow label={CALENDAR.next(view)} icon={ChevronRight} onPress={() => onStep(1)} />
    </HStack>
  );
}
