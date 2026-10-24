import { createContext, type ReactNode, useContext } from 'react';
import { View } from 'react-native';

import { useMorePanel } from './use-more-panel';

type MorePanelState = ReturnType<typeof useMorePanel>;

const MorePanelContext = createContext<MorePanelState | null>(null);

/**
 * Holds the More panel's open state above the tabs (app/(tabs)/_layout.tsx), so the bar that opens it and the screens
 * it covers read the same state.
 */
export function MorePanelProvider({ children }: { children: ReactNode }) {
  return <MorePanelContext.Provider value={useMorePanel()}>{children}</MorePanelContext.Provider>;
}

/** The More panel's state; needs MorePanelProvider above. */
export function useMore(): MorePanelState {
  const state = useContext(MorePanelContext);
  if (!state)
    throw new Error('useMore() needs a MorePanelProvider above it (app/(tabs)/_layout.tsx)');
  return state;
}

/**
 * A tab screen, out of TalkBack's reach while the More panel covers it (Android has no accessibilityViewIsModal; on
 * iOS the bar's modal container does this).
 */
export function BehindMorePanel({ children }: { children: ReactNode }) {
  const { open } = useMore();
  return (
    <View
      testID="behind-more-panel"
      style={{ flex: 1 }}
      importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
    >
      {children}
    </View>
  );
}
