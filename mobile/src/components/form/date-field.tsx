// Date field (prototype due / start / leave dates): a pill showing "Oct 9" that opens the system date picker
// (@react-native-community/datetimepicker). Values are ISO dates, read and written in UTC like src/data/dates.ts.
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Platform } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { monthDay, toUtc } from '@/data/dates';

export const DATE_FIELD = { none: 'No date' } as const;

const toIso = (d: Date) => d.toISOString().slice(0, 10);

type DateFieldProps = {
  /** Accessible name ("Due date"). */
  label: string;
  /** ISO date, or null when unset. */
  value: string | null;
  onChange: (iso: string) => void;
  /** Where the calendar opens when there is no value yet: the sample "today" (src/data/sample/today.ts). */
  initial: string;
  /** Earliest ISO date the picker allows. */
  min?: string;
  testID?: string;
};

/** Pill with the date; tapping it opens the picker (iOS inline under the pill, Android its dialog). */
export function DateField({ label, value, onChange, initial, min, testID }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  // Android's dialog closes itself after a pick; iOS stays inline until the pill is tapped again.
  const pick = (_: unknown, date: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    onChange(toIso(date));
  };
  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? monthDay(value) : DATE_FIELD.none }}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="min-h-11 justify-center rounded-control border border-input bg-card px-3"
      >
        <HStack className="items-center gap-2">
          <Text className={`flex-1 text-body ${value ? '' : 'text-muted-foreground'}`}>
            {value ? monthDay(value) : DATE_FIELD.none}
          </Text>
          <Icon as={CalendarDays} size="lg" className="text-muted-foreground" />
        </HStack>
      </Pressable>
      {open && (
        <DateTimePicker
          testID={testID && `${testID}-picker`}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          timeZoneName="UTC"
          value={toUtc(value ?? initial)}
          minimumDate={min ? toUtc(min) : undefined}
          onValueChange={pick}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
