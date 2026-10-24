// Error line under a group of controls (a time range, a picker) where the kit Field's own error line does not reach.
import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { Text } from '@/components/ui/text';

/** Red footnote, announced as it appears: a live region on Android, an announcement on iOS (which has none). */
export function FormError({ children, testID }: { children: string; testID?: string }) {
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(children);
  }, [children]);
  return (
    <Text
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="text-footnote text-destructive"
    >
      {children}
    </Text>
  );
}
