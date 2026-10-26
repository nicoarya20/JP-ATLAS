// Body of a sheet route (prototype kit Sheet): X to close at the top left, title and sub line, the content, then the
// stacked actions. On iOS the route is a transparent modal and OwnSheet draws the panel; on Android it is a native
// formSheet (fitToContents), already edge to edge, and this is its body (src/navigation/stack-presentation.ts).
//
// In the formSheet the ScrollView is the root on purpose: react-native-screens sizes a formSheet's scroll view to the
// sheet, and only keeps its origin when it is the screen's first view. Wrapped (it was in a KeyboardAvoidingView), it
// falls back to `setFrame:screen.frame` and takes the sheet's offset on screen, so the content sat below the sheet and
// the sheet looked empty (react-native-screens 4.30, RNSScreen.mm correctScrollViewFrame). The keyboard is handled by
// the scroll view's own insets instead.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OWN_SHEET } from '@/navigation/stack-presentation';

import { OwnSheet } from './own-sheet';
import { SheetActions, SheetHead } from './sheet-parts';

export { SHEET_FRAME } from './sheet-parts';

type SheetFrameProps = {
  title?: string;
  sub?: string;
  /** Closes the sheet; defaults to going back, which dismisses the sheet route. */
  onClose?: () => void;
  /** Buttons stacked at the bottom (main action first, like the prototype). */
  actions?: ReactNode;
  children?: ReactNode;
  testID?: string;
};

/** Sheet layout that keeps its inputs above the keyboard and its actions above the home indicator. */
export function SheetFrame({ onClose = router.back, ...props }: SheetFrameProps) {
  return OWN_SHEET ? (
    <OwnSheet onClose={onClose} {...props} />
  ) : (
    <NativeSheetBody onClose={onClose} {...props} />
  );
}

/** The formSheet's body (Android); exported for its test. */
export function NativeSheetBody({
  title,
  sub,
  onClose,
  actions,
  children,
  testID,
}: SheetFrameProps & { onClose: () => void }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      className="bg-card"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerClassName="gap-4 px-4 pt-3"
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
    >
      <SheetHead title={title} sub={sub} onClose={onClose} />
      {children}
      <SheetActions>{actions}</SheetActions>
    </ScrollView>
  );
}
