// Small pieces the Projects screens share (prototype projects.parts.jsx and kit Section/Info): a titled card, a soft
// box, a label above a control, a muted note, the progress bar with its percentage, the AI mark, a labelled
// checkbox, and the Cancel + primary foot.
import { router } from 'expo-router';
import { Check, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
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

/**
 * Small label above a non-text control (chips, a select, a date), a star when it is required, and an optional hint.
 * The control carries the label as its own name (fieldName), so the visible one stays out of the reading order.
 */
export function Labelled({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="text-footnote text-muted-foreground"
      >
        {required ? `${label} *` : label}
      </Text>
      {children}
      {hint && <Note>{hint}</Note>}
    </VStack>
  );
}

/** Progress bar with its percentage after it; label = the bar's accessible name. */
export function Bar({ value, label, percent }: { value: number; label: string; percent: string }) {
  return (
    <HStack className="items-center gap-3">
      <View className="flex-1">
        <Progress value={value} accessibilityLabel={label}>
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

type CheckRowProps = {
  label: string;
  value: boolean;
  onChange: (on: boolean) => void;
  children?: ReactNode;
};

/** Checkbox whose label is its accessible name; children replace the visible label. */
export function CheckRow({ label, value, onChange, children }: CheckRowProps) {
  return (
    <Checkbox
      value={label}
      // aria-label: gluestack names the checkbox itself and overrides accessibilityLabel
      aria-label={label}
      isChecked={value}
      onChange={onChange}
      className="min-h-11 flex-1 gap-3"
    >
      <CheckboxIndicator>
        <CheckboxIcon as={Check} />
      </CheckboxIndicator>
      {children ?? <CheckboxLabel className="flex-1 text-body">{label}</CheckboxLabel>}
    </Checkbox>
  );
}

type FootProps = {
  cancel?: string;
  label: string;
  ok?: boolean;
  onPress: () => void;
  children?: ReactNode;
};

/** Foot of a form step: Cancel (back) and the primary action, disabled until ok; children = the primary's content. */
export function Foot({ cancel = CREATE.cancel, label, ok = true, onPress, children }: FootProps) {
  return (
    <>
      <Button variant="outline" className="flex-1" onPress={() => router.back()}>
        <ButtonText>{cancel}</ButtonText>
      </Button>
      <Button className="flex-[2]" isDisabled={!ok} onPress={onPress} accessibilityLabel={label}>
        {children ?? <ButtonText>{label}</ButtonText>}
      </Button>
    </>
  );
}
