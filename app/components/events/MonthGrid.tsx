import { Box, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { FIRST_DAY_OF_WEEK } from '~/lib/date-config';
import type { DummyEvent } from './events.dummy';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_IN_WEEK = 7;
const MAX_SHOWN = 2;

/** Cells of the month grid: leading blanks for the first weekday, then each day number. */
export function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lead = (first - FIRST_DAY_OF_WEEK + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

type Props = {
  year: number;
  month: number;
  title: string;
  events: readonly DummyEvent[];
  today: string;
};

/** Hand-made month calendar (the date input is only for form fields); event titles sit in their day. */
export function MonthGrid({ year, month, title, events, today }: Props) {
  const iso = (d: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const heads = [...WEEKDAYS.slice(FIRST_DAY_OF_WEEK), ...WEEKDAYS.slice(0, FIRST_DAY_OF_WEEK)];
  return (
    <Stack gap="xs">
      <Text fw={700}>{title}</Text>
      <Box style={{ overflowX: 'auto' }}>
        <SimpleGrid
          cols={DAYS_IN_WEEK}
          spacing={4}
          style={{ minWidth: 560 }}
          role="grid"
          aria-label={title}
        >
          {heads.map((h) => (
            <Text key={h} size="xs" fw={700} ta="center" c="dimmed">
              {h}
            </Text>
          ))}
          {monthCells(year, month).map((d, i) => {
            // Blank leading cells have no identity; their position in the row is their key.
            // biome-ignore lint/suspicious/noArrayIndexKey: static filler cells that never reorder
            if (d === null) return <div key={`blank-${i}`} />;
            const list = events.filter((e) => e.date === iso(d));
            return (
              <Paper
                key={d}
                withBorder
                p={6}
                radius="sm"
                mih={84}
                bg={iso(d) === today ? 'var(--mantine-primary-color-light)' : undefined}
              >
                <Text size="xs" fw={iso(d) === today ? 700 : 400}>
                  {d}
                </Text>
                {list.slice(0, MAX_SHOWN).map((e) => (
                  <Text key={e.id} size="xs" truncate title={`${e.start} ${e.title}`}>
                    {`${e.start} ${e.title}`}
                  </Text>
                ))}
                {list.length > MAX_SHOWN && (
                  <Text size="xs" c="dimmed">{`+${list.length - MAX_SHOWN} lagi`}</Text>
                )}
              </Paper>
            );
          })}
        </SimpleGrid>
      </Box>
    </Stack>
  );
}
