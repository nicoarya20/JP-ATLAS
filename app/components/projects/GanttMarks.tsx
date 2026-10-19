/** Optional extras of a Gantt row: stage bars under the project bar and milestone diamonds above it. */
import { Box } from '@mantine/core';
import type { PlacedMilestone, PlacedSegment } from './gantt-layout';
import { filled, light, scaledRem } from './gantt-style';
import { GANTT_COPY } from './projects.copy';

export function GanttSegments({ segments }: { segments: PlacedSegment[] }) {
  return (
    <>
      {segments.map((g) => {
        const label = g.done ? GANTT_COPY.stageDone(g.label) : GANTT_COPY.stageOpen(g.label);
        return (
          <Box
            key={`${g.label}-${g.startDate}`}
            role="img"
            aria-label={label}
            title={label}
            style={{
              position: 'absolute',
              left: `${g.leftPct}%`,
              width: `${g.widthPct}%`,
              minWidth: scaledRem(0.5),
              bottom: '0.4em',
              height: '0.5em',
              borderRadius: '0.25em',
              background: g.done ? filled('ok') : light('gray'),
              border: `1px solid ${g.done ? filled('ok') : filled('gray')}`,
              zIndex: 1,
            }}
          />
        );
      })}
    </>
  );
}

export function GanttMilestones({ milestones }: { milestones: PlacedMilestone[] }) {
  return (
    <>
      {milestones.map((m) => {
        const label = m.reached
          ? GANTT_COPY.milestoneReached(m.label)
          : GANTT_COPY.milestoneOpen(m.label);
        return (
          <Box
            key={`${m.label}-${m.leftPct}`}
            role="img"
            aria-label={label}
            title={label}
            style={{
              position: 'absolute',
              left: `${m.leftPct}%`,
              top: '0.4em',
              width: '0.9em',
              height: '0.9em',
              transform: 'translateX(-50%) rotate(45deg)',
              // Filled when reached, hollow when not: the shape state is readable without colour.
              background: m.reached ? filled('ok') : 'var(--mantine-color-body)',
              border: `2px solid ${filled('ok')}`,
              zIndex: 1,
            }}
          />
        );
      })}
    </>
  );
}
