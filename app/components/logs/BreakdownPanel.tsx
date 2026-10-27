import { Box, Group, Paper, Progress, Stack, Text, UnstyledButton } from '@mantine/core';
import { percent } from '~/lib/visits-format';
import { TruncatedText } from './TruncatedText';

export type BreakdownItem = { key: string | null; count: number };

const nf = new Intl.NumberFormat('id-ID');

type RowProps = {
  label: string;
  count: number;
  pct: number;
  mono?: boolean;
  onClick?: () => void;
  ariaLabel: string;
};

function BreakdownRow({ label, count, pct, mono, onClick, ariaLabel }: RowProps) {
  const body = (
    <Stack gap={4} w="100%">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <TruncatedText size="sm" ff={mono ? 'monospace' : undefined} miw={0}>
          {label}
        </TruncatedText>
        <Text size="xs" c="dimmed" flex="0 0 auto">
          {nf.format(count)} · {pct}%
        </Text>
      </Group>
      <Progress value={pct} size="xs" radius="xl" />
    </Stack>
  );
  // A plain row and a pressable row must occupy the same block box, so both get a wrapper.
  if (!onClick) return <Box>{body}</Box>;
  return (
    <UnstyledButton onClick={onClick} aria-label={ariaLabel} display="block" w="100%">
      {body}
    </UnstyledButton>
  );
}

export type BreakdownPanelProps = {
  title: string;
  items: BreakdownItem[];
  total: number;
  render: (key: string | null) => string;
  onSelect?: (key: string) => void;
  mono?: boolean;
  emptyText?: string;
};

/** Top-N list with share bars. Rows become buttons when `onSelect` is given. */
export function BreakdownPanel({
  title,
  items,
  total,
  render,
  onSelect,
  mono,
  emptyText,
}: BreakdownPanelProps) {
  return (
    <Paper withBorder p="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.3} mb="sm">
        {title}
      </Text>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          {emptyText ?? 'Belum ada data.'}
        </Text>
      ) : (
        <Stack gap="xs">
          {items.map((it) => {
            const key = it.key;
            return (
              <BreakdownRow
                key={key ?? 'null'}
                label={render(key)}
                count={it.count}
                pct={percent(it.count, total)}
                mono={mono}
                onClick={onSelect && key ? () => onSelect(key) : undefined}
                ariaLabel={`Filter ${title}: ${render(key)}`}
              />
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
