/** Stage pieces (inside the project bar) and milestone diamonds (above it) of one timeline row. */
import { Box } from '@mantine/core';
import { Link } from 'react-router';
import { formatCalendarDate } from '~/components/ui/DateText';
import type { PlacedMilestone, PlacedSegment } from './gantt-layout';
import { GANTT_PLAN_COPY } from './gantt-plan.copy';
import {
  MILESTONE_SIZE_EM,
  milestoneStyle,
  milestoneTop,
  scaledRem,
  stageHeight,
  stageStyle,
  stageTop,
} from './gantt-style';

/** A stage piece stays visible even when its phase is a single day. */
const STAGE_MIN_WIDTH_REM = 0.5;
const STAGE_RADIUS_EM = '0.2em';

/** Both kinds are links to the project like the bar, so a click on them never "misses" the row. */
type Props = { href: string };

export function GanttSegments({
  segments,
  color,
  href,
}: Props & { segments: PlacedSegment[]; color: string }) {
  return (
    <>
      {segments.map((g) => {
        const label = GANTT_PLAN_COPY.stage(
          g.label,
          formatCalendarDate(g.startDate),
          formatCalendarDate(g.dueDate),
          GANTT_PLAN_COPY.status[g.status],
        );
        return (
          <Box
            key={g.id}
            component={Link}
            to={href}
            tabIndex={-1}
            aria-label={label}
            title={label}
            pos="absolute"
            left={`${g.leftPct}%`}
            w={`${g.widthPct}%`}
            miw={scaledRem(STAGE_MIN_WIDTH_REM)}
            top={stageTop()}
            h={stageHeight()}
            bdrs={STAGE_RADIUS_EM}
            // `stageStyle` paints the fill and edge that say done / running / not started, and
            // Mantine has no `z-index` prop (docs/ui-pola.md §3).
            style={{ zIndex: 1, ...stageStyle(g.status, color) }}
          />
        );
      })}
    </>
  );
}

export function GanttMilestones({
  milestones,
  hasStages,
  href,
}: Props & { milestones: PlacedMilestone[]; hasStages: boolean }) {
  return (
    <>
      {milestones.map((m) => {
        const date = formatCalendarDate(m.date);
        const label = m.reached
          ? GANTT_PLAN_COPY.milestoneReached(m.label, date)
          : GANTT_PLAN_COPY.milestoneOpen(m.label, date);
        return (
          <Box
            key={m.id}
            component={Link}
            to={href}
            tabIndex={-1}
            aria-label={label}
            title={label}
            pos="absolute"
            left={`${m.leftPct}%`}
            top={milestoneTop(hasStages)}
            w={`${MILESTONE_SIZE_EM}em`}
            h={`${MILESTONE_SIZE_EM}em`}
            // A diamond is a square turned 45 degrees around its own centre; `milestoneStyle`
            // paints reached / not reached, and Mantine has no `transform` or `z-index` prop.
            style={{
              transform: 'translate(-50%, -50%) rotate(45deg)',
              zIndex: 1,
              ...milestoneStyle(m.reached),
            }}
          />
        );
      })}
    </>
  );
}
