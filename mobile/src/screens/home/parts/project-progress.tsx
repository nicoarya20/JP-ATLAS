import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { S } from '../home.strings';

type ProjectProgressProps = {
  value: number;
  label?: string;
  /** What the server wrote next to the bar ("4/10"); without it the percentage is shown. */
  display?: string;
  onMuted?: boolean;
};

/** Violet progress bar with an optional label and number. On a muted panel the track steps up to the surface. */
export function ProjectProgress({ value, label, display, onMuted }: ProjectProgressProps) {
  return (
    <VStack className="gap-1">
      {label && (
        <HStack className="justify-between">
          <Text className="text-footnote">{label}</Text>
          <Text className="text-footnote text-muted-foreground">{display ?? S.percent(value)}</Text>
        </HStack>
      )}
      <Progress
        value={value}
        accessibilityLabel={label}
        className={onMuted ? 'bg-card' : undefined}
      >
        <ProgressFilledTrack />
      </Progress>
    </VStack>
  );
}
