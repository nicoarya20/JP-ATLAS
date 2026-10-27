/** "Milestone" section: dated goals with their phase, reached mark and, for managers, the actions. */
import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { MILESTONES_PER_PROJECT } from '@server/project/project.limits';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiFlag,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
} from 'react-icons/fi';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { PLAN_COPY } from './plan.copy';
import { isMilestoneOverdue, type PlanBusy } from './plan-view';

export type MilestoneHandlers = {
  onEdit: (m: MilestoneDto) => void;
  onRemove: (m: MilestoneDto) => void;
  onToggleReached: (m: MilestoneDto) => void;
};

function ReachedBadge({ m, overdue }: { m: MilestoneDto; overdue: boolean }) {
  if (m.reachedAt) {
    return (
      <Badge variant="light" color="ok" leftSection={<FiCheckCircle size="1.25em" aria-hidden />}>
        {PLAN_COPY.reached(formatCalendarDate(m.reachedAt))}
      </Badge>
    );
  }
  const Icon = overdue ? FiAlertTriangle : FiClock;
  return (
    <Badge
      variant="light"
      color={overdue ? 'warn' : 'gray'}
      leftSection={<Icon size="1.25em" aria-hidden />}
    >
      {overdue ? PLAN_COPY.overdue : PLAN_COPY.notReached}
    </Badge>
  );
}

type RowProps = MilestoneHandlers & {
  milestone: MilestoneDto;
  phaseName: string | null;
  today: string;
  canManage: boolean;
  busy: PlanBusy;
};

function MilestoneRow({ milestone: m, phaseName, today, canManage, busy, ...on }: RowProps) {
  const mine = busy?.id === m.id ? busy.action : null;
  return (
    <Paper component="li" withBorder p="md" data-milestone={m.id}>
      <Stack gap="sm">
        <Stack gap={4} miw={0}>
          <Group gap="xs" wrap="wrap">
            {/* Clamped, not wrapped: every milestone card keeps the same height (K-5). */}
            <Text fw={600} lineClamp={2}>
              {m.title}
            </Text>
            <ReachedBadge m={m} overdue={isMilestoneOverdue(m, today)} />
          </Group>
          <Group gap="xs" wrap="wrap" c="dimmed">
            <FiCalendar size="1.25em" aria-hidden />
            <Text size="sm">{PLAN_COPY.due(formatCalendarDate(m.dueDate))}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {phaseName ? PLAN_COPY.inPhase(phaseName) : PLAN_COPY.noPhase}
          </Text>
        </Stack>
        {canManage && (
          <Group gap="xs" wrap="wrap">
            <Button
              variant="default"
              leftSection={
                m.reachedAt ? (
                  <FiRotateCcw size="1.25em" aria-hidden />
                ) : (
                  <FiCheckCircle size="1.25em" aria-hidden />
                )
              }
              aria-label={
                m.reachedAt ? PLAN_COPY.unmarkReachedOf(m.title) : PLAN_COPY.markReachedOf(m.title)
              }
              loading={mine === 'reach'}
              onClick={() => on.onToggleReached(m)}
            >
              {m.reachedAt ? PLAN_COPY.unmarkReached : PLAN_COPY.markReached}
            </Button>
            <Button
              variant="default"
              leftSection={<FiEdit2 size="1.25em" aria-hidden />}
              aria-label={PLAN_COPY.editMilestoneOf(m.title)}
              onClick={() => on.onEdit(m)}
            >
              {PLAN_COPY.edit}
            </Button>
            <Button
              variant="light"
              color="danger"
              leftSection={<FiTrash2 size="1.25em" aria-hidden />}
              aria-label={PLAN_COPY.removeMilestoneOf(m.title)}
              loading={mine === 'remove'}
              onClick={() => on.onRemove(m)}
            >
              {PLAN_COPY.remove}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

type Props = MilestoneHandlers & {
  milestones: readonly MilestoneDto[];
  phases: readonly PhaseDto[];
  /** The server's today (team time zone), to flag a missed date. */
  today: string;
  canManage: boolean;
  busy: PlanBusy;
  onAdd: () => void;
};

export function MilestoneList({ milestones, phases, today, canManage, busy, onAdd, ...on }: Props) {
  const full = milestones.length >= MILESTONES_PER_PROJECT;
  const phaseName = new Map(phases.map((p) => [p.id, p.name]));
  return (
    <Stack gap="sm" component="section" aria-labelledby="plan-milestones-title">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={4} miw={0}>
          {/* The handoff defines three heading sizes and no h4; order={3} is already the 20 px section. */}
          <Title order={3} id="plan-milestones-title">
            {PLAN_COPY.milestonesTitle}
          </Title>
          <Text size="sm" c="dimmed">
            {PLAN_COPY.milestonesHint}
          </Text>
        </Stack>
        {canManage && (
          <Button
            leftSection={<FiPlus size="1.25em" aria-hidden />}
            disabled={full}
            onClick={onAdd}
          >
            {PLAN_COPY.addMilestone}
          </Button>
        )}
      </Group>
      {canManage && full && (
        <Text size="sm" c="dimmed" data-reason>
          {PLAN_COPY.milestoneLimit(MILESTONES_PER_PROJECT)}
        </Text>
      )}
      {milestones.length === 0 ? (
        <EmptyState
          icon={FiFlag}
          title={PLAN_COPY.milestonesEmptyTitle}
          description={canManage ? PLAN_COPY.milestonesEmptyBody : PLAN_COPY.milestonesEmptyReader}
        />
      ) : (
        <Stack
          component="ol"
          gap="sm"
          aria-label={PLAN_COPY.milestonesLabel}
          m={0}
          p={0}
          // Mantine has no `list-style` style prop; `List` would change the markup of the cards.
          style={{ listStyle: 'none' }}
        >
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              phaseName={m.phaseId ? (phaseName.get(m.phaseId) ?? null) : null}
              today={today}
              canManage={canManage}
              busy={busy}
              {...on}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
