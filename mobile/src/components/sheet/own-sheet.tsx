// The sheet iOS draws for us no more (OWN_SHEET, src/navigation/stack-presentation.ts): the route is a transparent
// modal, and this paints the dim and an edge-to-edge panel pinned to the bottom, like the prototype's bottom sheet
// (riset-keano/prototype-react, react-cupertino-ui BottomSheet). iOS 26's own formSheet floats inset from the screen's
// edges below its large detent, with no way to opt out, so the content looked cut off on three sides.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { SHEET_FRAME, SheetActions, SheetHead } from './sheet-parts';
import { useOwnSheet } from './use-own-sheet';

type OwnSheetProps = {
  title?: string;
  sub?: string;
  onClose: () => void;
  actions?: ReactNode;
  children?: ReactNode;
  testID?: string;
};

/**
 * Dim + panel. The grabber, X and title stay put while the rest scrolls; dragging them down (or tapping the dim, or a
 * screen reader's escape) closes the sheet. The panel rides above the keyboard and never grows under the status bar.
 */
export function OwnSheet({ title, sub, onClose, actions, children, testID }: OwnSheetProps) {
  const s = useOwnSheet(onClose);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, s.veil]}>
        <Pressable
          testID="sheet-dim"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          accessibilityLabel={SHEET_FRAME.close}
          onPress={onClose}
          className="flex-1 bg-veil"
        />
      </Animated.View>
      <Animated.View
        testID={testID}
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        onLayout={(e) => s.onHeight(e.nativeEvent.layout.height)}
        className="absolute inset-x-0 overflow-hidden rounded-t-modal bg-card"
        style={[{ maxHeight: s.maxHeight }, s.panel]}
      >
        <GestureDetector gesture={s.pan}>
          <View className="gap-4 px-4 pb-1">
            <View className="h-5 items-center justify-center">
              <View className="h-[5px] w-9 rounded-full bg-border" />
            </View>
            <SheetHead title={title} sub={sub} onClose={onClose} />
          </View>
        </GestureDetector>
        <ScrollView
          style={{ flexGrow: 0 }}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: s.padBottom }}
        >
          {children}
          <SheetActions>{actions}</SheetActions>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
