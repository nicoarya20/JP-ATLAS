/** One project on the timeline: a sticky label cell (name link, status, dates) and its bar or diamond. */
import { Anchor, Box, Group, Stack, Text } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import { Link } from 'react-router';
import { formatCalendarDate } from '~/components/ui/DateText';
import { CONDITION_LABELS, PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { GanttMilestones, GanttSegments } from './GanttMarks';
import type { GanttRowLayout, MonthTick } from './gantt-layout';
import {
  BAR_MIN_WIDTH,
  filled,
  GRID_LINE,
  ganttColor,
  LABEL_WIDTH,
  light,
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
      style={{ flex: '0 0 auto', borderRight: GRID_LINE, minWidth: 0 }}
    >
      <Stack gap={2} style={{ minWidth: 0 }}>
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
          <Group gap={4} wrap="nowrap" c={`${cond.color}.8`}>
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
        style={{
          position: 'absolute',
          left: `${row.leftPct}%`,
          top: '50%',
          width: '1.1em',
          height: '1.1em',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          background: filled(color),
          zIndex: 1,
        }}
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
      style={{
        position: 'absolute',
        left: `${row.leftPct}%`,
        width: `${row.widthPct}%`,
        minWidth: BAR_MIN_WIDTH,
        top: '50%',
        height: '1.75em',
        transform: 'translateY(-50%)',
        borderRadius: '0.25em',
        overflow: 'hidden',
        background: light(color),
        border: `2px solid ${filled(color)}`,
        zIndex: 1,
      }}
    >
      <Box
        aria-hidden
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: `${percent}%`,
          background: filled(color),
          opacity: 0.85,
        }}
      />
    </Box>
  );
}

export function GanttRow({ project, row, months, todayPct, timelineRem }: Props) {
  return (
    <Box className="mk-gantt-row" style={{ display: 'flex', borderBottom: GRID_LINE }}>
      <LabelCell project={project} row={row} />
      <Box
        style={{
          position: 'relative',
          flex: `1 0 ${scaledRem(timelineRem)}`,
          minHeight: scaledRem(4.5),
        }}
      >
        {months.map((m) => (
          <Box
            key={m.key}
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${m.leftPct}%`,
              borderLeft: GRID_LINE,
            }}
          />
        ))}
        {todayPct !== null && (
          <Box
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${todayPct}%`,
              borderLeft: `2px dashed ${filled('danger')}`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}
        <Track project={project} row={row} />
        <GanttSegments segments={row.segments} />
        <GanttMilestones milestones={row.milestones} />
      </Box>
    </Box>
  );
}
