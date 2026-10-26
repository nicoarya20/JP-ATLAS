// One group of the Filter & sort sheet (prototype `.field` + Label): a small label over its control (Chips, a
// SelectField, a RadioList).
import type { ReactNode } from 'react';

import { SectionLabel } from '@/components/form/section-label';
import { VStack } from '@/components/ui/vstack';

/** Label ("Status", "Project", "Sort by") over the control that sets it. */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <VStack className="gap-2">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </VStack>
  );
}
