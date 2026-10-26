// Which presentation a sheet route gets per platform (src/navigation/stack-presentation.ts): iOS draws its own panel
// over a see-through route, since iOS 26's formSheet floats inset from the screen's edges; Android keeps the formSheet.
import type * as Presentation from '../../src/navigation/stack-presentation';

/** The module as loaded on platform `os`. */
function loadOn(os: 'ios' | 'android'): typeof Presentation {
  let mod: typeof Presentation | undefined;
  jest.isolateModules(() => {
    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    mod = require('../../src/navigation/stack-presentation');
  });
  if (!mod) throw new Error(`stack-presentation did not load on ${os}`);
  return mod;
}

describe('SHEET', () => {
  test('iOS: a see-through route with no motion or swipe of its own; SheetFrame draws and moves the panel', () => {
    const { OWN_SHEET, SHEET } = loadOn('ios');
    expect(OWN_SHEET).toBe(true);
    expect(SHEET).toEqual({
      presentation: 'transparentModal',
      animation: 'none',
      gestureEnabled: false,
      contentStyle: { backgroundColor: 'transparent' },
    });
  });

  test('Android: the native formSheet sized to its content, with a grabber and the modal radius', () => {
    const { OWN_SHEET, SHEET } = loadOn('android');
    expect(OWN_SHEET).toBe(false);
    expect(SHEET).toEqual({
      presentation: 'formSheet',
      sheetAllowedDetents: 'fitToContents',
      sheetGrabberVisible: true,
      sheetCornerRadius: 16,
    });
  });
});
