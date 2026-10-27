/** One project on the timeline: a sticky label cell (name link, status, dates) and its bar or diamond. */
import { Anchor, Box, Group, Stack, Text } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { formatCalendarDate } from '~/components/ui/DateText';
import { CONDITION_LABELS, PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { GanttMilestones, GanttSegments } from './GanttMarks';
import { type GanttRowLayout, type MonthTick, monthGridImage } from './gantt-layout';
import {
  BAR_MIN_WIDTH,
  barHeight,
  filled,
  GRID_LINE,
  GRID_LINE_COLOR,
  ganttColor,
  LABEL_WIDTH,
  light,
  rowMinHeight,
  scaledRem,
} from './gantt-style';
import './project-click.css';
import { projectHref } from './ProjectCard';
import { GANTT_COPY } from './projects.copy';

type Props = {
  project: ProjectListItem;
  row: GanttRowLayout;
  months: MonthTick[];
  todayPct: number | null;
  timelineRem: number;
};

/** Sizes of the bar and the due-only diamond, in em so they follow the text scale. */
const DIAMOND_SIZE_EM = '1.1em';
const BAR_RADIUS_EM = '0.25em';
const BAR_BORDER_PX = 2;
const TODAY_LINE_PX = 2;
/** The progress fill sits on the bar's own light background, so it is slightly see-through. */
const FILL_OPACITY = 0.85;

const progressText = (p: ProjectListItem) =>
  p.progress.percent === null ? GANTT_COPY.noTasks : GANTT_COPY.progress(p.progress.percent);

/** Dates as words, so the bar's colour and length are never the only way to read them. */
function dateText(row: GanttRowLayout): string {
  if (row.kind === 'due') return GANTT_COPY.dueOnly(formatCalendarDate(row.dueDate));
  return GANTT_COPY.range(formatCalendarDate(row.startDate), formatCalendarDate(row.dueDate));
}

function LabelCell({ project: p, row }: Pick<Props, 'project' | 'row'>) {
  const status = PROJECT_STATUS_LABELS[p.status];
  const StatusIcon = status.icon;
  const cond = p.condition ? CONDITION_LABELS[p.condition.level] : null;
  const CondIcon = cond?.icon;
  return (
    <Box
      className="mk-gantt-label"
      w={LABEL_WIDTH}
      p="xs"
      flex="0 0 auto"
      miw={0}
      // `bd` sets all four sides; only the right-hand grid line belongs here.
      style={{ borderRight: GRID_LINE }}
    >
      <Stack gap={4} miw={0}>
        <Anchor
          component={Link}
          to={projectHref(p.id)}
          className="mk-row-link"
          fw={600}
          size="sm"
          lineClamp={2}
        >
          {p.name}
        </Anchor>
        <Group gap={4} wrap="wrap" c={`${status.color}.8`}>
          <StatusIcon size="1.25em" aria-hidden />
          <Text size="xs" fw={600} inherit>
            {`${status.label} · ${progressText(p)}`}
          </Text>
        </Group>
        {cond && CondIcon && (
          <Group gap={4} wrap="wrap" c={`${cond.color}.8`}>
            <CondIcon size="1.25em" aria-hidden />
            <Text size="xs" fw={600} inherit>
              {cond.label}
            </Text>
          </Group>
        )}
        <Text size="xs" c="dimmed">
          {dateText(row)}
        </Text>
      </Stack>
    </Box>
  );
}

function Track({ project: p, row }: Pick<Props, 'project' | 'row'>) {
  const hasStages = row.segments.length > 0;
  const color = ganttColor(p);
  const status = PROJECT_STATUS_LABELS[p.status].label;
  const percent = p.progress.percent ?? 0;
  const common = {
    component: Link,
    to: projectHref(p.id),
    // The name link in the label is the keyboard stop; the bar only adds a bigger mouse target.
    tabIndex: -1,
  } as const;
  if (row.kind === 'due') {
    const label = GANTT_COPY.dueLabel(p.name, formatCalendarDate(row.dueDate), status);
    return (
      <Box
        {...common}
        aria-label={label}
        title={label}
        pos="absolute"
        left={`${row.leftPct}%`}
        top="50%"
        w={DIAMOND_SIZE_EM}
        h={DIAMOND_SIZE_EM}
        bg={filled(color)}
        // The timeline is a painted coordinate system: Mantine has no prop for `transform`,
        // `overflow`, `pointer-events` or `z-index`, and every length here is already em/%/calc
        // so it follows the text scale without going through `rem()` (docs/ui-pola.md §3).
        style={{ transform: 'translate(-50%, -50%) rotate(45deg)', zIndex: 1 }}
      />
    );
  }
  const label = GANTT_COPY.barLabel(
    p.name,
    formatCalendarDate(row.startDate),
    formatCalendarDate(row.dueDate),
    status,
    progressText(p),
  );
  return (
    <Box
      {...common}
      aria-label={label}
      title={label}
      pos="absolute"
      left={`${row.leftPct}%`}
      w={`${row.widthPct}%`}
      miw={BAR_MIN_WIDTH}
      top="50%"
      h={barHeight(hasStages)}
      bdrs={BAR_RADIUS_EM}
      bg={light(color)}
      bd={`${BAR_BORDER_PX}px solid ${filled(color)}`}
      // The timeline is a painted coordinate system: Mantine has no prop for `transform`,
      // `overflow`, `pointer-events` or `z-index`, and every length here is already em/%/calc
      // so it follows the text scale without going through `rem()` (docs/ui-pola.md §3).
      style={{ transform: 'translateY(-50%)', overflow: 'hidden', zIndex: 1 }}
    >
      <Box
        aria-hidden
        pos="absolute"
        inset="0 auto 0 0"
        w={`${percent}%`}
        bg={filled(color)}
        opacity={FILL_OPACITY}
      />
    </Box>
  );
}

export function GanttRow({ project, row, months, todayPct, timelineRem }: Props) {
  const hasStages = row.segments.length > 0;
  const href = projectHref(project.id);
  // One painted layer for the whole month grid; drawing a Box per month per row did not scale (PD-01).
  const grid = useMemo(() => monthGridImage(months, GRID_LINE_COLOR), [months]);
  return (
    <Box
      className="mk-gantt-row"
      display="flex"
      // `bd` sets all four sides; only the bottom grid line belongs here.
      style={{ borderBottom: GRID_LINE }}
    >
      <LabelCell project={project} row={row} />
      <Box
        pos="relative"
        flex={`1 0 ${scaledRem(timelineRem)}`}
        mih={rowMinHeight(hasStages || row.milestones.length > 0)}
      >
        <Box
          aria-hidden
          pos="absolute"
          inset={0}
          // One painted layer for the whole grid; Mantine has no `background-image` or
          // `pointer-events` prop (docs/ui-pola.md §3).
          style={{ backgroundImage: grid, pointerEvents: 'none' }}
        />
        {todayPct !== null && (
          <Box
            aria-hidden
            pos="absolute"
            top={0}
            bottom={0}
            left={`${todayPct}%`}
            // A single dashed edge, so `bd` (all four sides) does not fit; no prop for the rest.
            style={{
              borderLeft: `${TODAY_LINE_PX}px dashed ${filled('danger')}`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}
        <Track project={project} row={row} />
        <GanttSegments segments={row.segments} color={ganttColor(project)} href={href} />
        <GanttMilestones milestones={row.milestones} hasStages={hasStages} href={href} />
      </Box>
    </Box>
  );
}
