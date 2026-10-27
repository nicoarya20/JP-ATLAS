/** "1 minggu / 2 minggu / 1 bulan / 3 bulan" buttons that fill the due date from the start date. */
import { Box, Button, Group, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import { FORM_COPY } from './projects.copy';

export type QuickRange = 'w1' | 'w2' | 'm1' | 'm3';

/** Weeks add days; months keep the day of month, clamped to the target month's last day. */
const RANGES: Record<QuickRange, { label: string; days?: number; months?: number }> = {
  w1: { label: '1 minggu', days: 7 },
  w2: { label: '2 minggu', days: 14 },
  m1: { label: '1 bulan', months: 1 },
  m3: { label: '3 bulan', months: 3 },
};
export const QUICK_RANGES = Object.keys(RANGES) as QuickRange[];
export const quickRangeLabel = (r: QuickRange) => RANGES[r].label;

const MS_PER_DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const lastDayOf = (year: number, month0: number) =>
  new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

/**
 * Due date `range` after `start` (`YYYY-MM-DD`, calendar days, no time zone). 31 Jan + 1 bulan is the
 * last day of February, never 3 March.
 */
export function quickDueDate(start: IsoDate, range: QuickRange): IsoDate {
  const [y, m, d] = start.split('-').map(Number) as [number, number, number];
  const { days = 0, months = 0 } = RANGES[range];
  const month0 = m - 1 + months;
  const year = y + Math.floor(month0 / 12);
  const targetMonth = ((month0 % 12) + 12) % 12;
  const day = Math.min(d, lastDayOf(year, targetMonth));
  const t = Date.UTC(year, targetMonth, day) + days * MS_PER_DAY;
  const out = new Date(t);
  return `${out.getUTCFullYear()}-${pad(out.getUTCMonth() + 1)}-${pad(out.getUTCDate())}` as IsoDate;
}

/** Dates a quick button fills: the start stays when set, otherwise it becomes the server's today. */
export function quickRangeDates(
  start: string | null,
  today: IsoDate,
  range: QuickRange,
): { startDate: IsoDate; dueDate: IsoDate } {
  const startDate = (start ?? today) as IsoDate;
  return { startDate, dueDate: quickDueDate(startDate, range) };
}

export function QuickDates({ onPick }: { onPick: (range: QuickRange) => void }) {
  return (
    <Box>
      <Text size="sm" c="dimmed" mb="xs" id="quick-dates-label">
        {FORM_COPY.quickLabel}
      </Text>
      <Group gap="xs" wrap="wrap" role="group" aria-labelledby="quick-dates-label">
        {QUICK_RANGES.map((r) => (
          <Button key={r} variant="default" onClick={() => onPick(r)}>
            {RANGES[r].label}
          </Button>
        ))}
      </Group>
    </Box>
  );
}
