import { Group, SegmentedControl } from '@mantine/core';
import type { IconType } from 'react-icons';

export type ViewOption<V extends string> = { value: V; label: string; icon: IconType };

type Props<V extends string> = {
  value: V;
  onChange: (value: V) => void;
  options: ViewOption<V>[];
  /** Names the control for screen readers, e.g. "Pilih tampilan tugas". */
  ariaLabel?: string;
};

/** Switch between views of the same data (List / Papan); every option has a text label, not an icon only. */
export function ViewToggle<V extends string>({
  value,
  onChange,
  options,
  ariaLabel = 'Pilih tampilan',
}: Props<V>) {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as V)}
      aria-label={ariaLabel}
      size="sm"
      data={options.map(({ value: v, label, icon: Icon }) => ({
        value: v,
        label: (
          <Group component="span" gap="xs" justify="center">
            <Icon size="1.25em" aria-hidden />
            {label}
          </Group>
        ),
      }))}
    />
  );
}
