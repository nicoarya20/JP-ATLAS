import type { ReactNode } from 'react';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type ListRowProps = {
  title: string;
  sub?: ReactNode;
  lead?: ReactNode;
  right?: ReactNode;
  /** Draws the row as its own soft card (My Focus rows), instead of a plain line. */
  soft?: boolean;
  /** Full-width part under the row (a project's progress bar), so its length never depends on the right part. */
  below?: ReactNode;
  onPress?: () => void;
};

/** One list row: optional lead, title over a muted sub line, optional right part. Tappable when onPress is set. */
export function ListRow({ title, sub, lead, right, soft, below, onPress }: ListRowProps) {
  const row = (
    <HStack
      className={`min-h-11 items-center gap-3 ${soft ? 'rounded-card bg-muted px-3 py-2' : 'py-2'}`}
    >
      {lead}
      <VStack className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="text-body">
          {title}
        </Text>
        {typeof sub === 'string' ? (
          <Text className="text-footnote text-muted-foreground">{sub}</Text>
        ) : (
          sub
        )}
      </VStack>
      {right && <HStack className="shrink-0">{right}</HStack>}
    </HStack>
  );
  const body = below ? (
    <VStack className="pb-2">
      {row}
      {below}
    </VStack>
  ) : (
    row
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="data-[active=true]:opacity-70"
    >
      {body}
    </Pressable>
  );
}
