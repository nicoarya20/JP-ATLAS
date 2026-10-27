/** "Tahapan" section: the ordered phase cards, the add button (managers) and the empty state. */
import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { PHASES_PER_PROJECT } from '@server/project/project.limits';
import type { PhaseDto } from '@server/project/project-plan.dto';
import { FiLayers, FiPlus } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PhaseCard, type PhaseHandlers } from './PhaseCard';
import { PLAN_COPY } from './plan.copy';
import type { PlanBusy } from './plan-view';

type Props = PhaseHandlers & {
  phases: readonly PhaseDto[];
  canManage: boolean;
  busy: PlanBusy;
  onAdd: () => void;
};

export function PhaseList({ phases, canManage, busy, onAdd, ...handlers }: Props) {
  const full = phases.length >= PHASES_PER_PROJECT;
  return (
    <Stack gap="sm" component="section" aria-labelledby="plan-phases-title">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        {/* The handoff defines three heading sizes and no h4; order={3} is already the 20 px section. */}
        <Title order={3} id="plan-phases-title">
          {PLAN_COPY.phasesTitle}
        </Title>
        {canManage && (
          <Button
            leftSection={<FiPlus size="1.25em" aria-hidden />}
            disabled={full}
            onClick={onAdd}
          >
            {PLAN_COPY.addPhase}
          </Button>
        )}
      </Group>
      {canManage && full && (
        <Text size="sm" c="dimmed" data-reason>
          {PLAN_COPY.phaseLimit(PHASES_PER_PROJECT)}
        </Text>
      )}
      {phases.length === 0 ? (
        <EmptyState
          icon={FiLayers}
          title={PLAN_COPY.phasesEmptyTitle}
          description={canManage ? PLAN_COPY.phasesEmptyBody : PLAN_COPY.phasesEmptyReader}
        />
      ) : (
        <Stack
          component="ol"
          gap="sm"
          aria-label={PLAN_COPY.phasesLabel}
          m={0}
          p={0}
          // Mantine has no `list-style` style prop; `List` would change the markup of the cards.
          style={{ listStyle: 'none' }}
        >
          {phases.map((phase, index) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              index={index}
              total={phases.length}
              canManage={canManage}
              busy={busy}
              {...handlers}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
