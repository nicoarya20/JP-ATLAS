import { Button, Group, Popover, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiChevronDown, FiFilter } from 'react-icons/fi';
import { RESET_FILTER_LABEL } from './EmptyState';

export const FILTER_LABEL = 'Filter';
const NO_ACTIVE_HINT = 'Belum ada filter aktif';

type Props = {
  /** Number of filters that differ from their default; drives the count on the button. */
  activeCount: number;
  onReset: () => void;
  /** The filter fields. A `Select` inside needs `comboboxProps={{ withinPortal: false }}`, or choosing an option counts as an outside click and closes the popover. */
  children: ReactNode;
};

/** "Filter ▾" button that opens the filter fields in a panel, with a count and a reset (R05 §3.4 #10). */
export function FilterPopover({ activeCount, onReset, children }: Props) {
  const active = activeCount > 0;
  return (
    <Popover position="bottom-start" shadow="md" trapFocus withArrow>
      <Popover.Target>
        <Button
          variant={active ? 'light' : 'default'}
          size="sm"
          leftSection={<FiFilter size="1.25em" aria-hidden />}
          rightSection={<FiChevronDown size="1.25em" aria-hidden />}
        >
          {active ? `${FILTER_LABEL} (${activeCount})` : FILTER_LABEL}
        </Button>
      </Popover.Target>
      {/* Width follows the screen so the panel never overflows a 375px phone. */}
      <Popover.Dropdown w={{ base: 'calc(100vw - 2rem)', sm: 340 }}>
        <Stack gap="sm">
          {children}
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs" c="dimmed">
              {active ? `${activeCount} filter aktif` : NO_ACTIVE_HINT}
            </Text>
            <Button variant="subtle" size="sm" disabled={!active} onClick={onReset}>
              {RESET_FILTER_LABEL}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
