/** Ordered phases as a row of steps: done ✓, the running one filled, upcoming ones empty; name under the icon. */
import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import type { PhaseStatus } from '@server/pm/enums';
import type { PhaseDto } from '@server/project/project-plan.dto';
import type { IconType } from 'react-icons';
import { FiCheck, FiCircle } from 'react-icons/fi';
import { NEXT_PHASE_COPY, PHASE_STATUS_TEXT } from './summary.copy';

type StepLook = { icon: IconType | null; color: string; variant: 'filled' | 'default' | 'light' };

// Shape and words carry the state, the colour only backs them up (WCAG 1.4.1).
const LOOK: Record<PhaseStatus, StepLook> = {
  done: { icon: FiCheck, color: 'ok', variant: 'filled' },
  in_progress: { icon: FiCircle, color: 'blue', variant: 'filled' },
  not_started: { icon: null, color: 'gray', variant: 'default' },
};

function Step({ phase }: { phase: PhaseDto }) {
  const { icon: Icon, color, variant } = LOOK[phase.status];
  const current = phase.status === 'in_progress';
  return (
    <Stack
      component="li"
      gap={4}
      align="center"
      miw={88}
      maw={128}
      style={{ listStyle: 'none', flexShrink: 0 }}
      aria-current={current ? 'step' : undefined}
    >
      <ThemeIcon radius="xl" size="lg" color={color} variant={variant}>
        {Icon && <Icon size="1.25em" aria-hidden />}
      </ThemeIcon>
      <Text size="sm" fw={current ? 700 : 500} ta="center" style={{ overflowWrap: 'anywhere' }}>
        {phase.name}
      </Text>
      <Text size="xs" c="dimmed">
        {PHASE_STATUS_TEXT[phase.status]}
      </Text>
    </Stack>
  );
}

/** Scrolls sideways inside its card when there are more steps than fit, so a phone never overflows the page. */
export function PhaseStepper({ phases }: { phases: readonly PhaseDto[] }) {
  return (
    <Box style={{ overflowX: 'auto' }}>
      <Group
        component="ol"
        gap="md"
        wrap="nowrap"
        align="flex-start"
        p={0}
        m={0}
        aria-label={NEXT_PHASE_COPY.stepperLabel}
        style={{ width: 'max-content', minWidth: '100%', flexShrink: 0 }}
      >
        {phases.map((p) => (
          <Step key={p.id} phase={p} />
        ))}
      </Group>
    </Box>
  );
}
