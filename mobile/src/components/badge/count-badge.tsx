// New-item count (iOS badge style): white figures on the iOS alert red (MOBILE_STATUS), as on the More panel tiles and the Profile Inbox row.
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/** Solid red count; `className` places it (the More tile pins it to its corner). Decorative: the row or tile names it. */
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`h-5 min-w-5 items-center justify-center rounded-full bg-alert px-[5px] ${className}`}
    >
      <Text className="text-[11px] font-semibold text-alert-foreground">{count}</Text>
    </View>
  );
}
