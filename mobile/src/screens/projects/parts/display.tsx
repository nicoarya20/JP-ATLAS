// Read-only pieces the Projects screens share (prototype projects.parts.jsx and kit Section): a titled card, a soft
// box, a muted note, a headline, and the progress bar with its percentage.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type SecProps = {
  title?: string;
  right?: ReactNode;
  strong?: boolean;
  children: ReactNode;
  testID?: string;
};

/** Card with an optional headline and trailing part; strong = the violet-edged card (the current phase). */
export function Sec({ title, right, strong, children, testID }: SecProps) {
  return (
    <VStack
      testID={testID}
      className={`gap-3 rounded-card bg-card p-4 ${strong ? 'border-2 border-atlas' : ''}`}
    >
      {(title || right) && (
        <HStack className="items-center justify-between gap-2">
          {title && (
            <Text accessibilityRole="header" className="flex-1 text-headline font-semibold">
              {title}
            </Text>
          )}
          {right}
        </HStack>
      )}
      {children}
    </VStack>
  );
}

/** Grey box for a side note (deadline history, roles note, AI banner). */
export function Soft({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="gap-2 rounded-card bg-muted p-3">
      {typeof children === 'string' ? <Text className="text-subhead">{children}</Text> : children}
    </View>
  );
}

/** Footnote in the secondary colour. */
export function Note({ children }: { children: ReactNode }) {
  return <Text className="text-footnote text-muted-foreground">{children}</Text>;
}

/** Headline between cards. */
export function Head({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="text-headline font-semibold">
      {children}
    </Text>
  );
}

/** Progress bar with its percentage after it, read as one progress bar named `label` with its value (0–100). */
export function Bar({ value, label, percent }: { value: number; label: string; percent: string }) {
  return (
    <HStack
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value }}
      className="items-center gap-3"
    >
      <View className="flex-1">
        <Progress value={value}>
          <ProgressFilledTrack />
        </Progress>
      </View>
      <Text className="text-subhead font-semibold">{percent}</Text>
    </HStack>
  );
}
