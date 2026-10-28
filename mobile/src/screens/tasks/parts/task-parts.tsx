// Small parts every Tasks screen shares (prototype tasks.parts.jsx): the soft note card, a detail section with its
// headline, the pinned foot bar, a violet text link and a button that can show a spinner.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SPACING } from '@/theme/tokens';

/** Muted card for a note in place of actions (prototype `.tk-soft`). */
export function Soft({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="gap-2 rounded-card bg-muted p-4">
      {children}
    </View>
  );
}

/** Detail section: a headline (and an optional right part) over its content. */
export function Sec({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-3 pt-2">
      <HStack className="items-center justify-between gap-2">
        <Text accessibilityRole="header" className="text-headline font-semibold">
          {title}
        </Text>
        {right}
      </HStack>
      {children}
    </VStack>
  );
}

/** Action bar pinned under the scrolling content, above the home indicator; the last button is the wider one. */
export function Foot({ children }: { children: ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <HStack
      className="gap-3 border-t border-border bg-background px-4 pt-3"
      style={{ paddingBottom: bottom + SPACING.sm }}
    >
      {children}
    </HStack>
  );
}

type ActProps = {
  label: string;
  /** Accessible name when the visible label has a symbol ("+ Add step" → "Add step"). */
  name?: string;
  /** Why it is disabled ("Enter a title to save."), read after the name (UX §5). */
  hint?: string;
  onPress: () => void;
  /** lime main action (default), outline, danger, or a violet text link. */
  kind?: 'primary' | 'outline' | 'danger' | 'link';
  disabled?: boolean;
  /** Request in flight: spinner and no second press until the server answers (UX §2). */
  loading?: boolean;
  /** Share the row: grow to fill it (`wide` takes more room, like the prototype's last foot button). */
  grow?: boolean;
  wide?: boolean;
  testID?: string;
};

const VARIANT = {
  primary: 'default',
  outline: 'outline',
  danger: 'destructive',
  link: 'link',
} as const;

/** One button of a Tasks screen. */
export function Act({
  label,
  name,
  hint,
  onPress,
  kind = 'outline',
  disabled,
  loading,
  grow,
  wide,
  testID,
}: ActProps) {
  const flex = wide ? 'flex-[1.7]' : grow ? 'flex-1' : '';
  return (
    <Button
      testID={testID}
      variant={VARIANT[kind]}
      isDisabled={disabled || loading}
      onPress={onPress}
      accessibilityLabel={name}
      accessibilityHint={hint}
      accessibilityState={{ busy: !!loading, disabled: !!(disabled || loading) }}
      className={`${flex} ${kind === 'link' ? 'self-start' : ''}`}
    >
      {loading && <ButtonSpinner />}
      <ButtonText>{label}</ButtonText>
    </Button>
  );
}
