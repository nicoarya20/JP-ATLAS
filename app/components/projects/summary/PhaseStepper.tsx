/** Ordered phases as a row of steps: done ✓, the running one filled, upcoming ones empty; name under the icon. */
import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import type { PhaseStatus } from '@server/pm/enums';
import type { PhaseDto } from '@server/project/project-plan.dto';
import type { IconType } from 'react-icons';
import { FiCheck, FiCircle } from 'react-icons/fi';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { NEXT_PHASE_COPY, PHASE_STATUS_TEXT } from './summary.copy';

type StepLook = { icon: IconType | null; color: string; variant: 'filled' | 'default' | 'light' };

// Shape and words carry the state, the colour only backs them up (WCAG 1.4.1).
const LOOK: Record<PhaseStatus, StepLook> = {
  done: { icon: FiCheck, color: 'ok', variant: 'filled' },
  in_progress: { icon: FiCircle, color: 'blue', variant: 'filled' },
  not_started: { icon: null, color: 'gray', variant: 'default' },
};

/** A step column: wide enough for a two-word phase name, capped so ten steps still scroll. */
const STEP_MIN_WIDTH = 88;
const STEP_MAX_WIDTH = 128;

function Step({ phase }: { phase: PhaseDto }) {
  const { icon: Icon, color, variant } = LOOK[phase.status];
  const current = phase.status === 'in_progress';
  return (
    <Stack
      component="li"
      gap={4}
      align="center"
      miw={STEP_MIN_WIDTH}
      maw={STEP_MAX_WIDTH}
      flex="0 0 auto"
      // Mantine has no `list-style` style prop; `List` cannot lay the steps out in a row.
      style={{ listStyle: 'none' }}
      aria-current={current ? 'step' : undefined}
    >
      <ThemeIcon radius="xl" size="lg" color={color} variant={variant}>
        {Icon && <Icon size="1.25em" aria-hidden />}
      </ThemeIcon>
      {/* A step is a fixed-width column, so a long phase name wraps rather than widening it. */}
      <Text size="sm" fw={current ? 700 : 500} ta="center" style={WRAP_ANYWHERE}>
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
    // Mantine has no `overflow` style prop: the steps scroll sideways rather than widening
    // the card (CLAUDE.md mobile §2).
    <Box style={{ overflowX: 'auto' }}>
      <Group
        component="ol"
        gap="md"
        wrap="nowrap"
        align="flex-start"
        p={0}
        m={0}
        aria-label={NEXT_PHASE_COPY.stepperLabel}
        w="max-content"
        miw="100%"
        flex="0 0 auto"
      >
        {phases.map((p) => (
          <Step key={p.id} phase={p} />
        ))}
      </Group>
    </Box>
  );
}
