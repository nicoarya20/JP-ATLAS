// Label–value list (prototype detail `<dl>` facts): "Status · In progress", "Due · Oct 5", one fact per line.
import type { ReactNode } from 'react';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/** One fact: its label and its value (text, or a node such as a status pill or a link). */
export type Fact = readonly [label: string, value: ReactNode];

/** Facts as label (muted, left) and value (right) rows; empty values are left out. */
export function Facts({ facts, testID }: { facts: readonly Fact[]; testID?: string }) {
  const shown = facts.filter(([, value]) => value !== undefined && value !== null && value !== '');
  return (
    <VStack testID={testID} className="gap-2">
      {shown.map(([label, value]) => (
        <HStack key={label} className="items-start gap-3">
          <Text className="w-28 shrink-0 text-subhead text-muted-foreground">{label}</Text>
          {typeof value === 'string' || typeof value === 'number' ? (
            <Text className="min-w-0 flex-1 text-subhead">{value}</Text>
          ) : (
            <HStack className="min-w-0 flex-1">{value}</HStack>
          )}
        </HStack>
      ))}
    </VStack>
  );
}
