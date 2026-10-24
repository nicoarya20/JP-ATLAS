import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Room the floating tab bar takes above the bottom safe area: 60 px bar + 16 px gap (prototype --tab-bar-space). */
export const TAB_BAR_SPACE = 76;

/** Bottom padding a tab screen's scroll content needs so its last row clears the floating tab bar. */
export function useTabBarInset(): number {
  return TAB_BAR_SPACE + useSafeAreaInsets().bottom;
}
