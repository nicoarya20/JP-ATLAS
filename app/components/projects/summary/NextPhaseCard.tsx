/** "Tahapan & milestone berikutnya" card of the Ringkasan tab: stepper, running phase, next milestone. */
import { Anchor, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectPlan } from '@server/project/project-plan.query';
import { FiFlag, FiLayers } from 'react-icons/fi';
import { Link } from 'react-router';
import { EmptyState } from '~/components/ui/EmptyState';
import { PhaseStepper } from './PhaseStepper';
import { currentPhaseLine, milestoneWhen, phasePercent } from './phase-view';
import { NEXT_PHASE_COPY } from './summary.copy';

type Props = {
  projectId: string;
  plan: Pick<ProjectPlan, 'phases' | 'currentPhase' | 'nextMilestone'>;
  today: IsoDate;
  /** From the server's `can.update`: a manager gets a way to start planning from the empty state. */
  canPlan: boolean;
};

const phasesPath = (projectId: string) => `/app/projects/${encodeURIComponent(projectId)}/phases`;

function Milestone({ plan, today }: Pick<Props, 'plan' | 'today'>) {
  const { nextMilestone: m } = plan;
  if (!m) {
    return (
      <Text size="sm" c="dimmed">
        {NEXT_PHASE_COPY.noMilestone}
      </Text>
    );
  }
  const when = milestoneWhen(m, today);
  return (
    <Group gap={6} wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
      <Text c={when.late ? 'danger' : undefined} lh={1.4}>
        <FiFlag size="1.25em" aria-hidden />
      </Text>
      <Text size="sm" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Text span fw={600}>{`${NEXT_PHASE_COPY.milestoneLabel}: ${m.title}`}</Text>
        {' — '}
        <Text span c={when.late ? 'danger' : 'dimmed'}>
          {when.text}
        </Text>
      </Text>
    </Group>
  );
}

function Running({ plan }: Pick<Props, 'plan'>) {
  const percent = plan.currentPhase ? phasePercent(plan.currentPhase) : null;
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {currentPhaseLine(plan.phases, plan.currentPhase)}
      </Text>
      {percent !== null && (
        <Progress value={percent} color="blue" aria-label={`Kemajuan tahapan ${percent}%`} />
      )}
    </Stack>
  );
}

export function NextPhaseCard({ projectId, plan, today, canPlan }: Props) {
  const empty = plan.phases.length === 0;
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <FiLayers size="1.25em" aria-hidden />
          <Text fw={600}>{NEXT_PHASE_COPY.title}</Text>
        </Group>
        {empty ? (
          <EmptyState
            icon={FiLayers}
            title={NEXT_PHASE_COPY.empty}
            description={NEXT_PHASE_COPY.emptyHint}
            action={
              canPlan ? { label: NEXT_PHASE_COPY.addPhases, to: phasesPath(projectId) } : undefined
            }
          />
        ) : (
          <>
            <PhaseStepper phases={plan.phases} />
            <Running plan={plan} />
            <Milestone plan={plan} today={today} />
            <Anchor component={Link} to={phasesPath(projectId)} size="sm">
              {NEXT_PHASE_COPY.seeAll}
            </Anchor>
          </>
        )}
      </Stack>
    </Paper>
  );
}
