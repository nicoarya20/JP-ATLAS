/** Legend of the stage pieces and milestone diamonds; drawn only when some row has them. */
import { Box, Group, Stack, Text } from '@mantine/core';
import type { PhaseStatus } from '@server/pm/enums';
import type { GanttLayout } from './gantt-layout';
import { GANTT_PLAN_COPY } from './gantt-plan.copy';
import { MILESTONE_SIZE_EM, milestoneStyle, stageStyle } from './gantt-style';

const STAGES: PhaseStatus[] = ['done', 'in_progress', 'not_started'];
/** Stage swatches use a neutral colour: the legend explains the pattern, the bar colour is the condition. */
const SWATCH_COLOR = 'gray';

export function GanttPlanLegend({ layout }: { layout: GanttLayout }) {
  const used = layout.rows.some((r) => r.segments.length > 0 || r.milestones.length > 0);
  if (!used) return null;
  return (
    <Stack gap={4}>
      <Group gap="md" wrap="wrap" role="group" aria-label={GANTT_PLAN_COPY.legendTitle}>
        {STAGES.map((status) => (
          <Group key={status} gap={6} wrap="wrap">
            <Box
              aria-hidden
              style={{
                width: '1.5em',
                height: '0.8em',
                borderRadius: '0.2em',
                ...stageStyle(status, SWATCH_COLOR),
              }}
            />
            <Text size="sm">{GANTT_PLAN_COPY.legendStage[status]}</Text>
          </Group>
        ))}
        {([true, false] as const).map((reached) => (
          <Group key={String(reached)} gap={6} wrap="wrap">
            <Box
              aria-hidden
              style={{
                width: `${MILESTONE_SIZE_EM}em`,
                height: `${MILESTONE_SIZE_EM}em`,
                transform: 'rotate(45deg)',
                margin: '0 0.2em',
                ...milestoneStyle(reached),
              }}
            />
            <Text size="sm">
              {reached
                ? GANTT_PLAN_COPY.legendMilestoneReached
                : GANTT_PLAN_COPY.legendMilestoneOpen}
            </Text>
          </Group>
        ))}
      </Group>
      <Text size="xs" c="dimmed">
        {GANTT_PLAN_COPY.legendWhere}
      </Text>
    </Stack>
  );
}
