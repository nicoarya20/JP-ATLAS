import { Button, Stack, Text, ThemeIcon } from '@mantine/core';
import type { IconType } from 'react-icons';
import { FiFilter } from 'react-icons/fi';
import { Link } from 'react-router';

export const RESET_FILTER_LABEL = 'Reset filter';
const FILTERED_TITLE = 'Tidak ada hasil yang cocok';
const FILTERED_HINT = 'Coba ubah atau hapus filter, lalu cari lagi.';

type Props = {
  icon: IconType;
  title: string;
  description?: string;
  /** Primary call to action; renders a link when `to` is set, otherwise a button. */
  action?: { label: string; to?: string; onClick?: () => void };
  /** The list is empty because of filters, not because there is no data. */
  filtered?: boolean;
  onReset?: () => void;
};

/** Tells "no data yet" apart from "no match for the filters" and offers the next step (R05 §3.4 #3). */
export function EmptyState({ icon: Icon, title, description, action, filtered, onReset }: Props) {
  const ShownIcon = filtered ? FiFilter : Icon;
  return (
    <Stack align="center" gap="xs" py="xl">
      <ThemeIcon variant="light" color="gray" size="xl" radius="xl">
        <ShownIcon size="1.25em" aria-hidden />
      </ThemeIcon>
      <Text fw={600} ta="center">
        {filtered ? FILTERED_TITLE : title}
      </Text>
      <Text size="sm" c="dimmed" ta="center" maw={360}>
        {filtered ? FILTERED_HINT : description}
      </Text>
      {filtered && onReset && (
        <Button variant="light" size="sm" mt="xs" onClick={onReset}>
          {RESET_FILTER_LABEL}
        </Button>
      )}
      {!filtered && action?.to && (
        <Button component={Link} to={action.to} variant="light" size="sm" mt="xs">
          {action.label}
        </Button>
      )}
      {!filtered && action && !action.to && (
        <Button variant="light" size="sm" mt="xs" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
