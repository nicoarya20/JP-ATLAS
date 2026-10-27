// Segmented control (prototype kit Seg); gluestack has none, so it is Pressables in a row. Also the Inbox / Project /
// Users section tabs, which the prototype draws the same way. A form pick (Online / In person, Month / Week) reads as
// radio buttons instead, so a screen never stacks two tab lists.
import type { LucideIcon } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { MIN_TARGET } from '@/theme/tokens';

/** A segment is drawn 32 pt tall (min-h-8, like the iOS segmented control); hitSlop above and below reaches 44 pt. */
const SEG_HEIGHT = 32;
const SLOP = { top: (MIN_TARGET - SEG_HEIGHT) / 2, bottom: (MIN_TARGET - SEG_HEIGHT) / 2 };

type SegProps = {
  items: readonly string[];
  /** Index of the picked segment. */
  value: number;
  onChange: (index: number) => void;
  /** Draw these icons instead of the labels; the labels stay as the segments' accessible names. */
  icons?: readonly LucideIcon[];
  /** Spoken names in place of the labels ("Just write" for "Just write ✦"); ignored unless one per item. */
  names?: readonly string[];
  /** 'tabs' (default) switches what the screen shows; 'radio' picks one value of a form or of a view inside a tab. */
  kind?: 'tabs' | 'radio';
  /** Accessible name of the whole row ("Location"). */
  label?: string;
  /** Lines a label may wrap to before it is cut with "…"; the row stretches every segment to the tallest one. */
  lines?: 1 | 2;
  testID?: string;
};

/** One row of equal segments; the picked one sits on a raised thumb and reads as the selected tab or checked radio. */
export function Seg({
  items,
  value,
  onChange,
  icons,
  names,
  kind = 'tabs',
  label: name,
  lines = 1,
  testID,
}: SegProps) {
  const radio = kind === 'radio';
  const spoken = names?.length === items.length ? names : undefined;
  return (
    <HStack
      testID={testID}
      accessibilityRole={radio ? 'radiogroup' : 'tablist'}
      accessibilityLabel={name}
      className="rounded-control bg-muted p-1"
    >
      {items.map((label, i) => {
        const on = i === value;
        const icon = icons?.[i];
        return (
          <Pressable
            key={label}
            accessibilityRole={radio ? 'radio' : 'tab'}
            accessibilityLabel={spoken?.[i] ?? label}
            accessibilityState={radio ? { checked: on } : { selected: on }}
            onPress={() => onChange(i)}
            hitSlop={SLOP}
            className={`min-h-8 flex-1 items-center justify-center rounded-control px-2 ${lines > 1 ? 'py-1' : ''} ${on ? 'border border-border bg-card' : ''}`}
          >
            {icon ? (
              <Icon
                as={icon}
                size="md"
                className={on ? 'text-foreground' : 'text-muted-foreground'}
              />
            ) : (
              <Text
                numberOfLines={lines}
                className={`text-center text-subhead font-semibold ${on ? 'text-foreground' : 'text-muted-foreground'}`}
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
