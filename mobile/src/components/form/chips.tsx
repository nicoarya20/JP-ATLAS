// Chip rows (prototype kit Chips / MultiChips): one pick for a filter, or several picks in item order.
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

type ChipProps = { label: string; on: boolean; onPress: () => void };

function Chip({ label, on, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-full px-4 ${on ? 'bg-accent' : 'bg-muted'}`}
    >
      <Text
        className={`text-subhead font-medium ${on ? 'text-accent-foreground' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      contentContainerClassName="gap-2"
    >
      {children}
    </ScrollView>
  );
}

type ChipsProps = {
  items: readonly string[];
  /** Index of the picked chip. */
  value: number;
  onChange: (index: number) => void;
  /** Names the row for screen readers. */
  label?: string;
};

/** Single-pick chip row: the picked chip is violet-tinted and reads as selected. */
export function Chips({ items, value, onChange, label }: ChipsProps) {
  return (
    <Row label={label}>
      {items.map((item, i) => (
        <Chip key={item} label={item} on={i === value} onPress={() => onChange(i)} />
      ))}
    </Row>
  );
}

type MultiChipsProps<V extends string> = {
  items: readonly { value: V; label: string }[];
  value: readonly V[];
  /** Every picked value after a tap, in item order. */
  onChange: (values: V[]) => void;
  label?: string;
};

/** Multi-pick chip row: each tap toggles one chip. */
export function MultiChips<V extends string>({
  items,
  value,
  onChange,
  label,
}: MultiChipsProps<V>) {
  const flip = (v: V) =>
    onChange(items.map((o) => o.value).filter((x) => (x === v) !== value.includes(x)));
  return (
    <Row label={label}>
      {items.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          on={value.includes(o.value)}
          onPress={() => flip(o.value)}
        />
      ))}
    </Row>
  );
}
