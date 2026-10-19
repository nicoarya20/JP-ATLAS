/** Top rows of the timeline: the month names, the "Hari ini" tag and the colour legend. */
import { Box, Group, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import { formatCalendarDate } from '~/components/ui/DateText';
import { CONDITION_LABELS } from '~/lib/pm-labels';
import { type GanttLayout, monthLabel } from './gantt-layout';
import { filled, GRID_LINE, LABEL_WIDTH, light, scaledRem } from './gantt-style';
import { GANTT_COPY } from './projects.copy';

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
            <Group key={level} gap={6} wrap="wrap">
              <Box
                aria-hidden
                style={{
                  width: '1.5em',
                  height: '0.9em',
                  background: light(color),
                  border: `2px solid ${filled(color)}`,
                  borderRadius: '0.2em',
                }}
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
    <Box style={{ display: 'flex', borderBottom: GRID_LINE }}>
      <Box
        className="mk-gantt-label"
        w={LABEL_WIDTH}
        p="xs"
        style={{ flex: '0 0 auto', borderRight: GRID_LINE, cursor: 'default' }}
      >
        <Text size="sm" fw={700}>
          {GANTT_COPY.rowsHeader}
        </Text>
      </Box>
      <Box
        style={{
          position: 'relative',
          flex: `1 0 ${scaledRem(layout.timelineRem)}`,
          minHeight: scaledRem(2.5),
        }}
      >
        {layout.months.map((m) => (
          <Text
            key={m.key}
            size="xs"
            fw={600}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${m.leftPct}%`,
              width: `${m.widthPct}%`,
              padding: '0.5em',
              borderLeft: GRID_LINE,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {monthLabel(m)}
          </Text>
        ))}
        {layout.todayPct !== null && (
          <Text
            size="xs"
            fw={700}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${layout.todayPct}%`,
              transform: 'translateX(-50%)',
              padding: '0 0.4em',
              color: filled('danger'),
              background: 'var(--mantine-color-body)',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            {GANTT_COPY.today}
          </Text>
        )}
      </Box>
    </Box>
  );
}
