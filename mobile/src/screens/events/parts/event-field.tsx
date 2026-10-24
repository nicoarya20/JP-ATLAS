// Form group of the event forms (prototype events.new.jsx Row): a small label above a non-text control, like the kit
// Field's label.
import type { ReactNode } from 'react';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { Note } from './event-parts';

type EvFieldProps = {
  label: string;
  hint?: string;
  /** Star after the label; the control inside says "required" in its own name. */
  required?: boolean;
  /** The control inside carries this label as its name, so screen readers skip the visible one (no double read). */
  named?: boolean;
  children: ReactNode;
};

/** Form group with a small label above a non-text control (Seg, Chips, a select), like the kit Field's label. */
export function EvField({ label, hint, required, named, children }: EvFieldProps) {
  return (
    <VStack className="gap-2">
      <Text
        accessibilityElementsHidden={named}
        importantForAccessibility={named ? 'no-hide-descendants' : 'auto'}
        className="text-footnote text-muted-foreground"
      >
        {required ? `${label} *` : label}
      </Text>
      {children}
      {hint && <Note>{hint}</Note>}
    </VStack>
  );
}
