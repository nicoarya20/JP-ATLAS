/** Gantt view: every project with dates as a bar on one shared month timeline; the rest listed below. */
import { Anchor, Box, Paper, Stack, Text, Title } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import { useMemo } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { Link } from 'react-router';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { GanttHeader, GanttLegend } from './GanttHeader';
import { GanttRow } from './GanttRow';
import { type GanttMilestone, type GanttSegment, layoutGantt } from './gantt-layout';
import { GRID_LINE } from './gantt-style';
import { projectHref } from './ProjectCard';
import { ProjectMore, type ProjectViewProps } from './ProjectMore';
import { GANTT_COPY, LIST_COPY } from './projects.copy';

/** Stages and milestones per project id; the stage feature fills it in, nothing passes it yet. */
export type GanttPlans = Record<
  string,
  { segments?: GanttSegment[]; milestones?: GanttMilestone[] }
>;

function Unscheduled({ projects }: { projects: ProjectListItem[] }) {
  if (projects.length === 0) return null;
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Title order={5}>{GANTT_COPY.unscheduledTitle}</Title>
        <Text size="sm" c="dimmed">
          {GANTT_COPY.unscheduledHint}
        </Text>
        <Stack gap="xs" component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
          {projects.map((p) => (
            <li key={p.id}>
              <Anchor
                component={Link}
                to={projectHref(p.id)}
                fw={600}
                style={{ overflowWrap: 'anywhere' }}
              >
                {p.name}
              </Anchor>
              {p.startDate && (
                <Text size="xs" c="dimmed">
                  {GANTT_COPY.onlyStart(formatCalendarDate(p.startDate))}
                </Text>
              )}
            </li>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

type Props = ProjectViewProps & { plans?: GanttPlans };

export function ProjectGantt({
  items,
  total,
  today,
  empty,
  hasMore,
  loadingMore,
  onMore,
  plans,
}: Props) {
  const layout = useMemo(
    () =>
      layoutGantt(
        items.map((p) => ({
          id: p.id,
          startDate: p.startDate,
          dueDate: p.dueDate,
          ...plans?.[p.id],
        })),
        today,
      ),
    [items, plans, today],
  );
  if (items.length === 0) return <>{empty}</>;
  const byId = new Map(items.map((p) => [p.id, p]));
  const rows = layout.rows.flatMap((row) => {
    const project = byId.get(row.id);
    return project ? [{ project, row }] : [];
  });
  const unscheduled = layout.unscheduled.flatMap((id) => byId.get(id) ?? []);
  return (
    <Stack gap="md">
      {rows.length > 0 ? (
        <>
          <GanttLegend layout={layout} today={today} />
          <Text size="xs" c="dimmed" hiddenFrom="md">
            {GANTT_COPY.scrollHint}
          </Text>
          {/* Focusable so the keyboard can scroll it; the label column stays put while the months scroll. */}
          <Box
            role="region"
            aria-label={LIST_COPY.ganttLabel}
            tabIndex={0}
            style={{
              overflowX: 'auto',
              border: GRID_LINE,
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Box style={{ width: 'max-content', minWidth: '100%' }}>
              <GanttHeader layout={layout} />
              {rows.map(({ project, row }) => (
                <GanttRow
                  key={project.id}
                  project={project}
                  row={row}
                  months={layout.months}
                  todayPct={layout.todayPct}
                  timelineRem={layout.timelineRem}
                />
              ))}
            </Box>
          </Box>
        </>
      ) : (
        <EmptyState
          icon={FiCalendar}
          title={GANTT_COPY.nothingToDraw}
          description={GANTT_COPY.nothingToDrawHint}
        />
      )}
      <Unscheduled projects={unscheduled} />
      <ProjectMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onMore={onMore}
      />
    </Stack>
  );
}
