// "Step n of 3" over the step's label and a progress bar (prototype events.outcomes.jsx StepHead).
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { OUTCOMES } from '../events.strings.outcomes';

/** How many steps the outcomes have. */
export const STEPS = 3;

/** The head of outcomes step `n`. */
export function StepHead({ n }: { n: number }) {
  return (
    <VStack className="gap-1">
      <Text className="text-footnote text-muted-foreground">{OUTCOMES.step(n)}</Text>
      <Text accessibilityRole="header" className="text-section font-bold text-foreground">
        {OUTCOMES.labels[n - 1]}
      </Text>
      <Progress value={Math.round((n / STEPS) * 100)} aria-label={OUTCOMES.step(n)}>
        <ProgressFilledTrack />
      </Progress>
    </VStack>
  );
}
