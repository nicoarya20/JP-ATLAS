// Grouped list (prototype kit Rows/Row, an iOS inset table): rows with a lead, title, sub line, right part and chevron.
import { ChevronRight } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/** A card holding rows, with a hairline between them. */
export function Rows({ children, testID }: { children: ReactNode; testID?: string }) {
  const rows = Children.toArray(children);
  return (
    <View testID={testID} className="overflow-hidden rounded-card bg-card">
      {rows.map((row, i) => (
        <View
          key={(row as { key?: string }).key ?? i}
          className={i > 0 ? 'border-t border-border' : ''}
        >
          {row}
        </View>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  /** Muted line under the title; a node for richer content. */
  sub?: ReactNode;
  /** Avatar or icon before the title. */
  lead?: ReactNode;
  /** Value, pill or switch after the title. */
  right?: ReactNode;
  /** Draws the chevron; defaults to true when the row opens something. */
  chevron?: boolean;
  onPress?: () => void;
  /** Screen reader name when the title alone is not enough. */
  accessibilityLabel?: string;
  testID?: string;
};

/** One row: tappable (with a chevron) when onPress is set. */
export function Row({
  title,
  sub,
  lead,
  right,
  chevron,
  onPress,
  accessibilityLabel,
  testID,
}: RowProps) {
  const body = (
    <HStack className="min-h-11 items-center gap-3 px-4 py-3">
      {lead}
      <VStack className="min-w-0 flex-1 gap-1">
        <Text className="text-body">{title}</Text>
        {typeof sub === 'string' ? (
          <Text className="text-footnote text-muted-foreground">{sub}</Text>
        ) : (
          sub
        )}
      </VStack>
      {right && <HStack className="shrink-0 items-center">{right}</HStack>}
      {(chevron ?? !!onPress) && (
        <Icon as={ChevronRight} size="lg" className="shrink-0 text-muted-foreground" />
      )}
    </HStack>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      className="data-[active=true]:bg-muted"
    >
      {body}
    </Pressable>
  );
}
