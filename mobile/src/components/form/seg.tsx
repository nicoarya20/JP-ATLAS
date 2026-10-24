// Segmented control (prototype kit Seg); gluestack has none, so it is Pressables in a row. Also the Inbox / Project /
// Users section tabs, which the prototype draws the same way.
import type { LucideIcon } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

type SegProps = {
  items: readonly string[];
  /** Index of the picked segment. */
  value: number;
  onChange: (index: number) => void;
  /** Draw these icons instead of the labels; the labels stay as the segments' accessible names. */
  icons?: readonly LucideIcon[];
  testID?: string;
};

/** One row of equal segments; the picked one sits on a raised thumb and reads as a selected tab. */
export function Seg({ items, value, onChange, icons, testID }: SegProps) {
  return (
    <HStack testID={testID} accessibilityRole="tablist" className="rounded-control bg-muted p-1">
      {items.map((label, i) => {
        const on = i === value;
        const icon = icons?.[i];
        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(i)}
            className={`min-h-11 flex-1 items-center justify-center rounded-control px-2 ${on ? 'border border-border bg-card' : ''}`}
          >
            {icon ? (
              <Icon
                as={icon}
                size="lg"
                className={on ? 'text-foreground' : 'text-muted-foreground'}
              />
            ) : (
              <Text
                numberOfLines={1}
                className={`text-subhead font-semibold ${on ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </HStack>
  );
}
