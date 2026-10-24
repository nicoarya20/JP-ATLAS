// Small layout pieces shared by the events screens (prototype events.parts.jsx): title + pills head, untinted section,
// bullets, muted note, grey box, the AI-assisted mark, two buttons side by side, a labelled checkbox. Form groups:
// event-field.tsx.
import { Check, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { AI_LABEL } from '../events.strings';

/** Event title with its status pills. */
export function EvHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack className="gap-2">
      <Text accessibilityRole="header" className="text-section font-bold text-foreground">
        {title}
      </Text>
      <HStack className="flex-wrap gap-2">{children}</HStack>
    </VStack>
  );
}

/** Untinted section: headline and an optional trailing tag (a pill), then its content. */
export function EvSec({
  title,
  tag,
  children,
}: {
  title: string;
  tag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      <HStack className="items-center justify-between gap-2">
        <Text accessibilityRole="header" className="text-headline font-semibold text-foreground">
          {title}
        </Text>
        {tag}
      </HStack>
      {children}
    </VStack>
  );
}

/** Bulleted list. */
export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <VStack className="gap-1">
      {items.map((t) => (
        <HStack key={t} className="gap-2">
          <Text className="text-subhead text-muted-foreground">•</Text>
          <Text className="flex-1 text-subhead text-foreground">{t}</Text>
        </HStack>
      ))}
    </VStack>
  );
}

/** Footnote in the secondary colour. */
export function Note({ children }: { children: ReactNode }) {
  return <Text className="text-footnote text-muted-foreground">{children}</Text>;
}

/** Grey info box. */
export function Box({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="gap-1 rounded-card bg-muted p-3">
      {typeof children === 'string' ? (
        <Text className="text-subhead text-foreground">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/** Marks an AI-assisted action. */
export function Ai() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={AI_LABEL}>
      <Icon as={Sparkles} size="sm" className="text-atlas" />
    </View>
  );
}

/** A note led by the AI mark: "✦ = AI-assisted. …". One stop for screen readers, "AI-assisted. …", without the mark or "=". */
export function AiNote({ children }: { children: string }) {
  return (
    <HStack
      accessible
      accessibilityLabel={children.replace(/^\s*=\s*/, '')}
      className="items-center gap-1"
    >
      <Ai />
      <View className="flex-1">
        <Note>{children}</Note>
      </View>
    </HStack>
  );
}

/** Two buttons side by side; wide = the second one larger. */
export function Two({ wide, children }: { wide?: boolean; children: [ReactNode, ReactNode] }) {
  const [first, second] = children;
  return (
    <HStack className="gap-2">
      <View className="flex-1">{first}</View>
      <View className={wide ? 'flex-[2]' : 'flex-1'}>{second}</View>
    </HStack>
  );
}

type CheckRowProps = { label: string; value: boolean; onChange: (on: boolean) => void };

/** Checkbox with its label (the replacement event, the recording consent); the label is its accessible name. */
export function CheckRow({ label, value, onChange }: CheckRowProps) {
  return (
    <Checkbox
      value={label}
      // aria-label: gluestack names the checkbox itself and overrides accessibilityLabel
      aria-label={label}
      isChecked={value}
      onChange={onChange}
      className="min-h-11 gap-3"
    >
      <CheckboxIndicator>
        <CheckboxIcon as={Check} />
      </CheckboxIndicator>
      <CheckboxLabel className="flex-1 text-body">{label}</CheckboxLabel>
    </Checkbox>
  );
}
