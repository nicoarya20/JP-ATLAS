// Render wrapper for a screen tested alone: what app/_layout.tsx puts above every screen and the screen needs (the
// gesture root a sheet's drag requires, and gluestack's theme). Use as `render(ui, { wrapper: Providers })`.
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

/** Gesture root + gluestack provider. test-only */
export const Providers = ({ children }: { children: ReactNode }) => (
  <GestureHandlerRootView>
    <GluestackUIProvider>{children}</GluestackUIProvider>
  </GestureHandlerRootView>
);
