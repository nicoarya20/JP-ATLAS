// Reanimated declares toHaveAnimatedStyle (installed by setUpTests in jest.setup.js) in a file nothing imports.
/// <reference path="../../node_modules/react-native-reanimated/lib/typescript/jestUtils/index.native.d.ts" />
// The sheet body (src/components/sheet/sheet-frame.tsx): on iOS (the test platform) it draws its own edge-to-edge panel
// over a dim, since iOS 26's formSheet floats inset from the screen's edges; on Android the native formSheet stays.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, usePreventRemove } from 'expo-router';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { NativeSheetBody, SheetFrame } from '../../src/components/sheet/sheet-frame';
import { OWN_SHEET_MOTION } from '../../src/components/sheet/use-own-sheet';
import { Button, ButtonText } from '../../src/components/ui/button';
import { Text } from '../../src/components/ui/text';
import { Providers } from '../helpers/providers';

jest.mock('expo-router', () => ({ router: { back: jest.fn() }, usePreventRemove: jest.fn() }));

// test-only: the panel's measured height, so a close needs a drag past 120 pt.
const PANEL_PX = 400;
const FRAME_MS = 16;

const show = (ui: React.ReactElement) => render(ui, { wrapper: Providers });

const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });

async function openSheet(onClose?: () => void) {
  await show(
    <SheetFrame testID="frame" title="Move task" sub="#21 Fix login" onClose={onClose}>
      <Text>Pick a column</Text>
    </SheetFrame>,
  );
  await fireEvent(screen.getByTestId('frame'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: PANEL_PX } },
  });
  return createGestureController('sheet-pan');
}

/** A drag down of dy, released at velocity vy (pt/s). */
async function drag(pan: ReturnType<typeof createGestureController>, dy: number, vy = 0) {
  await act(() => pan.begin({ translationY: 0 }));
  await act(() => pan.activate({ translationY: dy / 2 }));
  await act(() => pan.update({ translationY: dy, velocityY: vy }));
  await act(() => pan.end({ translationY: dy, velocityY: vy }));
  await advance(OWN_SHEET_MOTION.backMs + 100);
}

/** The last preventRemove flag and callback the sheet handed usePreventRemove. */
const prevention = () => {
  const [prevent, onPrevent] = jest.mocked(usePreventRemove).mock.calls.at(-1) ?? [];
  return { prevent, onPrevent };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('SheetFrame on iOS: its own panel', () => {
  test('title, sub, body and actions in a modal panel, not a scroll view', async () => {
    await show(
      <SheetFrame
        testID="frame"
        title="Move task"
        sub="#21 Fix login"
        actions={
          <Button>
            <ButtonText>Move</ButtonText>
          </Button>
        }
      >
        <Text>Pick a column</Text>
      </SheetFrame>,
    );
    expect(screen.getByRole('header', { name: 'Move task' })).toBeOnTheScreen();
    expect(screen.getByText('#21 Fix login')).toBeOnTheScreen();
    expect(screen.getByText('Pick a column')).toBeOnTheScreen();
    expect(screen.getByText('Move')).toBeOnTheScreen();
    const panel = screen.getByTestId('frame');
    expect(panel.type).not.toBe('RCTScrollView');
    expect(panel.props.accessibilityViewIsModal).toBe(true);
    expect(panel.props.className).toContain('rounded-t-modal');
  });

  test('the X, a tap on the dim and a screen reader escape all pop the route by default', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByTestId('sheet-dim', { includeHiddenElements: true }));
    await fireEvent(screen.getByTestId('frame'), 'accessibilityEscape');
    expect(router.back).toHaveBeenCalledTimes(3);
  });

  test('a given onClose replaces the pop', async () => {
    const onClose = jest.fn();
    await openSheet(onClose);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  test('the dim is out of screen readers’ reach (the X and escape close it there)', async () => {
    await openSheet();
    expect(screen.queryByTestId('sheet-dim')).not.toBeOnTheScreen();
  });

  test('holds the route’s removal until the panel has slid away, then lets it through', async () => {
    await openSheet();
    expect(prevention().prevent).toBe(true);

    const repeat = jest.fn();
    await act(async () => {
      prevention().onPrevent?.({ data: { action: { type: 'GO_BACK' } }, repeat });
      await advance(OWN_SHEET_MOTION.closeMs + 100);
    });

    expect(repeat).toHaveBeenCalledTimes(1);
    expect(prevention().prevent).toBe(false);
  });

  test.each([
    ['a drag past a third of the panel', PANEL_PX * 0.4, 0],
    ['a quick flick down', 40, OWN_SHEET_MOTION.closeVelocity + 300],
  ])('%s closes it', async (_, dy, vy) => {
    const onClose = jest.fn();
    const pan = await openSheet(onClose);
    await drag(pan, dy, vy);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a short, slow drag lets it settle back instead', async () => {
    const onClose = jest.fn();
    const pan = await openSheet(onClose);
    await drag(pan, 40, 100);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('frame')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
  });
});

describe('NativeSheetBody (Android formSheet)', () => {
  // react-native-screens keeps a formSheet's scroll view in place only when it is the screen's first view; wrapped (it
  // was in a KeyboardAvoidingView), it took the sheet's offset on screen and the sheet looked empty on device.
  test('is the scroll view itself, which keeps its inputs above the keyboard', async () => {
    const onClose = jest.fn();
    await show(
      <NativeSheetBody testID="frame" title="Sort" onClose={onClose}>
        <Text>Body</Text>
      </NativeSheetBody>,
    );
    const frame = screen.getByTestId('frame');
    expect(frame.type).toBe('RCTScrollView');
    expect(frame.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(screen.getByRole('header', { name: 'Sort' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
