// Muted label over a non-text control of a Tasks form or sheet (prototype tasks.form.fields.jsx Labelled). Every
// control it wraps carries the label as its own name (and "required" in it), so screen readers skip the visible label
// and its star instead of reading the name twice.
import type { ReactNode } from 'react';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type LabelledProps = {
  label: string;
  /** Star after the label; the control says "required" in its own name. */
  required?: boolean;
  children: ReactNode;
};

/** Muted label over its control. */
export function Labelled({ label, required, children }: LabelledProps) {
  return (
    <VStack className="min-w-0 flex-1 gap-1">
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="text-footnote text-muted-foreground"
      >
        {required ? `${label} *` : label}
      </Text>
      {children}
    </VStack>
  );
}
