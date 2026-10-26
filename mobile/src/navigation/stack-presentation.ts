// Stack screen options shared by the route layouts (docs/phase1-screens.md K3, docs/phase1-navigation.md §4.5).
import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

/** Sheet radius: JP Atlas modal radius (`lg`). */
const SHEET_CORNER_RADIUS = 16;

/**
 * Whether a sheet draws its own panel (SheetFrame → OwnSheet) over a see-through route instead of using the native
 * formSheet. iOS 26+ draws a formSheet below full height as a floating Liquid Glass card, inset about 8 pt from the
 * sides and the bottom, and react-native-screens 4.30 has no option to keep it edge to edge like the prototype's sheet.
 * Android's formSheet is edge to edge already, and there a transparentModal inside a tab's stack would draw under the
 * tab bar.
 */
export const OWN_SHEET = Platform.OS === 'ios';

/** Native form sheet sized to its content, with a grabber (swipe down, dim tap and escape close it). */
const NATIVE_SHEET: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: SHEET_CORNER_RADIUS,
};

/**
 * Full-screen see-through route (presented over the whole window, so over the tab bar too) with no motion of its own:
 * SheetFrame draws the dim and the panel, slides them in and out, and closes on swipe, dim tap and escape.
 */
const OWN_SHEET_ROUTE: NativeStackNavigationOptions = {
  presentation: 'transparentModal',
  animation: 'none',
  gestureEnabled: false,
  contentStyle: { backgroundColor: 'transparent' },
};

/** A prototype sheet: an edge-to-edge panel sized to its content, with a grabber. */
export const SHEET: NativeStackNavigationOptions = OWN_SHEET ? OWN_SHEET_ROUTE : NATIVE_SHEET;

/** A prototype modal screen (create and edit flows): slides up over the screen it opened from. */
export const MODAL: NativeStackNavigationOptions = { presentation: 'modal' };

/** A screen the person must not swipe away from (sign-in, a running recording). */
export const NO_SWIPE: NativeStackNavigationOptions = { gestureEnabled: false };
