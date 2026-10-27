/** Top rows of the timeline: the month names, the "Hari ini" tag and the colour legend. */
import { Box, Group, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import { formatCalendarDate } from '~/components/ui/DateText';
import { CONDITION_LABELS } from '~/lib/pm-labels';
import { type GanttLayout, monthLabel } from './gantt-layout';
import { filled, GRID_LINE, LABEL_WIDTH, light, scaledRem } from './gantt-style';
import { GANTT_COPY } from './projects.copy';

/** Legend swatch and header sizes, in em/rem so they follow the user's text scale. */
const SWATCH_WIDTH_EM = '1.5em';
const SWATCH_HEIGHT_EM = '0.9em';
const SWATCH_RADIUS_EM = '0.2em';
const SWATCH_BORDER_PX = 2;
const HEADER_HEIGHT_REM = 2.5;
const MONTH_PADDING_EM = '0.5em';
const TODAY_PADDING_EM = '0.4em';

const LEGEND = [
  ['on_track', 'ok'],
  ['at_risk', 'warn'],
  ['off_track', 'danger'],
] as const;

/** Colour is explained with the same icon and word the condition badge uses, so it is never the only cue. */
export function GanttLegend({ layout, today }: { layout: GanttLayout; today: IsoDate }) {
  const date = formatCalendarDate(today);
  return (
    <Stack gap={4}>
      <Group gap="md" wrap="wrap" role="group" aria-label={GANTT_COPY.legendTitle}>
        {LEGEND.map(([level, color]) => {
          const { label, icon: Icon } = CONDITION_LABELS[level];
          return (
            <Group key={level} gap="xs" wrap="wrap">
              <Box
                aria-hidden
                w={SWATCH_WIDTH_EM}
                h={SWATCH_HEIGHT_EM}
                bg={light(color)}
                bd={`${SWATCH_BORDER_PX}px solid ${filled(color)}`}
                bdrs={SWATCH_RADIUS_EM}
              />
              <Icon size="1.25em" aria-hidden />
              <Text size="sm">{label}</Text>
            </Group>
          );
        })}
      </Group>
      <Text size="xs" c="dimmed">
        {GANTT_COPY.legendNoCondition} {GANTT_COPY.dueOnlyLegend}
      </Text>
      <Text size="xs" c="dimmed">
        {layout.todayPct === null ? GANTT_COPY.todayOut(date) : GANTT_COPY.todayIn(date)}
      </Text>
    </Stack>
  );
}

export function GanttHeader({ layout }: { layout: GanttLayout }) {
  return (
    <Box
      display="flex"
      // `bd` sets all four sides; only the bottom grid line belongs here.
      style={{ borderBottom: GRID_LINE }}
    >
      <Box
        className="mk-gantt-label"
        w={LABEL_WIDTH}
        p="xs"
        flex="0 0 auto"
        // `bd` sets all four sides, and Mantine has no `cursor` prop: the header cell is not
        // clickable even though `mk-gantt-label` gives the row cells a pointer.
        style={{ borderRight: GRID_LINE, cursor: 'default' }}
      >
        <Text size="sm" fw={700}>
          {GANTT_COPY.rowsHeader}
        </Text>
      </Box>
      <Box
        pos="relative"
        flex={`1 0 ${scaledRem(layout.timelineRem)}`}
        mih={scaledRem(HEADER_HEIGHT_REM)}
      >
        {layout.months.map((m) => (
          <Text
            key={m.key}
            size="xs"
            fw={600}
            pos="absolute"
            top={0}
            bottom={0}
            left={`${m.leftPct}%`}
            w={`${m.widthPct}%`}
            p={MONTH_PADDING_EM}
            // A single left grid line, so `bd` (all four sides) does not fit; a month name is
            // kept on one line and clipped rather than widening its column, and Mantine has no
            // `white-space` or `overflow` prop (docs/ui-pola.md §3).
            style={{ borderLeft: GRID_LINE, whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            {monthLabel(m)}
          </Text>
        ))}
        {layout.todayPct !== null && (
          <Text
            size="xs"
            fw={700}
            pos="absolute"
            bottom={0}
            left={`${layout.todayPct}%`}
            py={0}
            px={TODAY_PADDING_EM}
            c={filled('danger')}
            bg="var(--mantine-color-body)"
            // The tag is centred on the line it marks and stays on one line; Mantine has no
            // `transform`, `white-space` or `z-index` prop (docs/ui-pola.md §3).
            style={{ transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 2 }}
          >
            {GANTT_COPY.today}
          </Text>
        )}
      </Box>
    </Box>
  );
}
