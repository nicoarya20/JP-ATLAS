// Stack screen options shared by the route layouts (docs/phase1-screens.md K3, docs/phase1-navigation.md §4.5).
import type { NativeStackNavigationOptions } from 'expo-router';

/** Sheet radius: JP Atlas modal radius (`lg`). */
const SHEET_CORNER_RADIUS = 16;

/** A prototype sheet: native form sheet sized to its content, with a grabber (swipe down, dim tap and escape close it). */
export const SHEET: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: SHEET_CORNER_RADIUS,
};

/** A prototype modal screen (create and edit flows): slides up over the screen it opened from. */
export const MODAL: NativeStackNavigationOptions = { presentation: 'modal' };

/** A screen the person must not swipe away from (sign-in, a running recording). */
export const NO_SWIPE: NativeStackNavigationOptions = { gestureEnabled: false };
