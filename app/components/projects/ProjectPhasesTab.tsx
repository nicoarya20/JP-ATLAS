import { Badge, Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { FiCheckCircle, FiCircle, FiLayers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { SectionCard } from '~/components/ui/SectionCard';
import { PhaseStepper } from './PhaseStepper';
import { DETAIL_COPY as C } from './project-detail.copy';
import type { Phase } from './projects.detail.dummy';
import { shortDate } from './projects.read';

const STATE_COLOR = { done: 'ok', current: 'blue', upcoming: 'gray' } as const;

function PhaseCard({ phase }: { phase: Phase }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Title order={5}>{phase.name}</Title>
          <Badge variant="light" color={STATE_COLOR[phase.state]}>
            {C.phaseState[phase.state]}
          </Badge>
        </Group>
        <Progress
          value={phase.progress}
          color="ok"
          aria-label={`${phase.name} ${phase.progress}%`}
        />
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={600}>
            {C.milestones}
          </Text>
          {phase.milestones.length === 0 && (
            <Text size="sm" c="dimmed">
              {C.noMilestones}
            </Text>
          )}
          {phase.milestones.map((m) => (
            <Group key={m.name} gap="xs" wrap="nowrap" align="flex-start">
              {m.done ? (
                <FiCheckCircle size="1.25em" aria-hidden />
              ) : (
                <FiCircle size="1.25em" aria-hidden />
              )}
              <Text size="sm">{`${m.name} · ${shortDate(m.due)}`}</Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

/** The Tahapan tab (flow ⑨): the phases on a line, then each one with its progress and milestones. */
export function ProjectPhasesTab({ phases }: { phases: readonly Phase[] }) {
  if (phases.length === 0) {
    return <EmptyState icon={FiLayers} title={C.phaseTitle} description={C.phasesEmpty} />;
  }
  return (
    <Stack gap="md">
      <SectionCard title={C.phaseTitle}>
        <PhaseStepper phases={phases} />
      </SectionCard>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {phases.map((p) => (
          <PhaseCard key={p.name} phase={p} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
