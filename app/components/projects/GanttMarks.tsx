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
            style={{
              position: 'absolute',
              left: `${g.leftPct}%`,
              width: `${g.widthPct}%`,
              minWidth: scaledRem(0.5),
              top: stageTop(),
              height: stageHeight(),
              borderRadius: '0.2em',
              zIndex: 1,
              ...stageStyle(g.status, color),
            }}
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
            style={{
              position: 'absolute',
              left: `${m.leftPct}%`,
              top: milestoneTop(hasStages),
              width: `${MILESTONE_SIZE_EM}em`,
              height: `${MILESTONE_SIZE_EM}em`,
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
