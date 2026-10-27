import { Anchor, Group, Paper, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/dates';
import type { TeamLoad, TeamProjectRef, TeamTaskRef } from '@server/team/team.dto';
import { FiCheckCircle, FiLock } from 'react-icons/fi';
import { Link } from 'react-router';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { TaskLabelChip } from '~/components/pm/TaskLabelChip';
import { DateText, describeDue } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { SectionCard } from '~/components/ui/SectionCard';
import { alsoElsewhereNote, loadSummary, TASKS_COPY, tasksCapped } from './team.detail.copy';

type Props = {
  name: string;
  tasks?: readonly TeamTaskRef[];
  tasksVisible: boolean;
  load?: TeamLoad;
  alsoElsewhere?: boolean;
  projects: readonly TeamProjectRef[];
  /** "Today" decided by the server, so "terlambat" matches the numbers it counted. */
  today: IsoDate;
};

/** Late wins over the status, like the most urgent label of a task row; status alone otherwise. */
function TaskChip({ task, late }: { task: TeamTaskRef; late: boolean }) {
  return late ? <TaskLabelChip label="overdue" /> : <StatusBadge status={task.status} />;
}

function TaskRow({ task, project, today }: { task: TeamTaskRef; project: string; today: IsoDate }) {
  const late = task.dueDate !== null && describeDue(task.dueDate, today).late;
  return (
    <Paper component="li" withBorder p="sm">
      <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
        <Stack gap={4} miw={0} flex="1 1 220px">
          {/* Clamped, not wrapped: every row in the list keeps the same height (K-5). */}
          <Anchor
            component={Link}
            to={`/app/tasks/${task.number}`}
            fw={600}
            c="inherit"
            lineClamp={2}
          >
            {`#${task.number} ${task.title}`}
          </Anchor>
          <Group gap="xs" wrap="wrap">
            <Text size="sm" c="dimmed">
              {project}
            </Text>
            <Text size="sm" c="dimmed" aria-hidden>
              ·
            </Text>
            {task.dueDate ? (
              <Group gap={4} wrap="wrap">
                <Text size="sm" c="dimmed">
                  {TASKS_COPY.due}
                </Text>
                <DateText value={task.dueDate} mode="due" today={today} />
              </Group>
            ) : (
              <Text size="sm" c="dimmed">
                {TASKS_COPY.noDue}
              </Text>
            )}
          </Group>
        </Stack>
        <TaskChip task={task} late={late} />
      </Group>
    </Paper>
  );
}

function Body({ tasks, projects, today, ...rest }: Props) {
  if (!rest.tasksVisible) {
    return (
      <Group gap="xs" wrap="nowrap" align="flex-start" c="dimmed">
        {/* A react-icons SVG takes no Mantine style props; the em nudge keeps the lock on
            the first text line at every text size. */}
        <FiLock size="1.25em" aria-hidden style={{ flexShrink: 0, marginTop: '0.15em' }} />
        <Text>{TASKS_COPY.hidden}</Text>
      </Group>
    );
  }
  if (!tasks || tasks.length === 0) {
    return <EmptyState icon={FiCheckCircle} title={TASKS_COPY.empty} />;
  }
  const names = new Map(projects.map((p) => [p.id, p.name]));
  return (
    <Stack
      gap="xs"
      component="ul"
      aria-label={TASKS_COPY.taskList}
      m={0}
      p={0}
      // Mantine has no `list-style` style prop, and `List` would change the markup of the rows.
      style={{ listStyle: 'none' }}
    >
      {tasks.map((t) => (
        <TaskRow
          key={t.number}
          task={t}
          project={names.get(t.projectId) ?? TASKS_COPY.otherProject}
          today={today}
        />
      ))}
    </Stack>
  );
}

/** The person's open work, only where the server allows it; says so plainly when it does not (D10). */
export function PersonTasksCard(props: Props) {
  const { name, tasks, load, alsoElsewhere } = props;
  const capped = load !== undefined && tasks !== undefined && tasks.length < load.active;
  return (
    <SectionCard title={TASKS_COPY.title}>
      <Stack gap="sm">
        {load && (
          <Text size="sm" fw={600}>
            {loadSummary(load.active, load.overdue)}
          </Text>
        )}
        <Body {...props} />
        {capped && (
          <Text size="sm" c="dimmed">
            {tasksCapped(tasks.length, load.active)}
          </Text>
        )}
        {(alsoElsewhere || load?.alsoElsewhere) && (
          <Text size="xs" c="dimmed">
            {alsoElsewhereNote(name)}
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}
