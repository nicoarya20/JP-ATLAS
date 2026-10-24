// Read-only pieces the Projects screens share (prototype projects.parts.jsx and kit Section/Info): a titled card, a soft
// box, a muted note, a headline, a label with its value, the progress bar with its percentage, and the AI mark.
import { Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { CREATE } from '../projects.strings';

type SecProps = {
  title?: string;
  right?: ReactNode;
  strong?: boolean;
  children: ReactNode;
  testID?: string;
};

/** Card with an optional headline and trailing part; strong = the violet-edged card (recommended, current phase). */
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

/** A label over its value, read as one stop ("Dates: Oct 7 – Dec 7, 2026"). */
export function Info({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <VStack
      testID={testID}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className="gap-0.5"
    >
      <Text className="text-footnote text-muted-foreground">{label}</Text>
      <Text className="text-body text-foreground">{value}</Text>
    </VStack>
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

/** Marks an AI-assisted action. */
export function Ai() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={CREATE.ai}>
      <Icon as={Sparkles} size="sm" className="text-atlas" />
    </View>
  );
}
