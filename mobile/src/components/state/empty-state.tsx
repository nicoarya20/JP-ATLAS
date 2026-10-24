// Empty state (prototype kit Empty): an icon, a title, a line of text and an optional action, so a list is never blank.
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type EmptyStateProps = {
  /** Lucide icon drawn above the title. */
  icon?: LucideIcon;
  /** Read by screen readers for the icon ("Empty archive"); without it the icon is decorative. */
  iconLabel?: string;
  title: string;
  text?: string;
  /** Usually one Button. */
  action?: ReactNode;
  testID?: string;
};

/** Centered icon, title, text and action for a list or screen with nothing in it. */
export function EmptyState({ icon, iconLabel, title, text, action, testID }: EmptyStateProps) {
  return (
    <VStack testID={testID} className="items-center gap-3 px-6 py-8">
      {icon && (
        <View
          accessible={!!iconLabel}
          accessibilityLabel={iconLabel}
          accessibilityRole={iconLabel ? 'image' : undefined}
        >
          <Icon as={icon} className="h-10 w-10 text-muted-foreground" />
        </View>
      )}
      <Text accessibilityRole="header" className="text-center text-section font-semibold">
        {title}
      </Text>
      {text && <Text className="text-center text-subhead text-muted-foreground">{text}</Text>}
      {action}
    </VStack>
  );
}
