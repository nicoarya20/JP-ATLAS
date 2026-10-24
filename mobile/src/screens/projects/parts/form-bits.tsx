// Form pieces the Projects screens share (prototype projects.parts.jsx): a label above a control, a labelled
// checkbox, and the Cancel + primary foot whose disabled primary says why.
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { CREATE } from '../projects.strings';
import { Note } from './display';

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
  /** Why the primary is off while !ok; read as its hint. */
  why?: string;
  onPress: () => void;
  children?: ReactNode;
};

/** Foot of a form step: Cancel (back) and the primary action, disabled until ok; children = the primary's content. */
export function Foot({
  cancel = CREATE.cancel,
  label,
  ok = true,
  why,
  onPress,
  children,
}: FootProps) {
  return (
    <>
      <Button variant="outline" className="flex-1" onPress={() => router.back()}>
        <ButtonText>{cancel}</ButtonText>
      </Button>
      <Button
        className="flex-[2]"
        isDisabled={!ok}
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityHint={ok ? undefined : why}
      >
        {children ?? <ButtonText>{label}</ButtonText>}
      </Button>
    </>
  );
}
