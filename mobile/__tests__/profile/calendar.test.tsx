import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetEvents } from '../../src/data/events.store';
import type { Role } from '../../src/data/sample';
import { CalendarScreen } from '../../src/screens/profile/calendar.screen';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const PM: Role = 'pm';

// test-only: a 350 px strip, so a page needs 87.5 px of drag.
const STRIP_PX = 350;
const FRAME_MS = 16;
/** Longer than the 220 ms slide. */
const SETTLED_MS = 400;

const Providers = ({ children }: { children: React.ReactNode }) => (
  <GestureHandlerRootView>
    <GluestackUIProvider>{children}</GluestackUIProvider>
  </GestureHandlerRootView>
);

const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });

async function open() {
  await render(<CalendarScreen role={PM} />, { wrapper: Providers });
  await fireEvent(screen.getByTestId('week-strip'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: STRIP_PX, height: 72 } },
  });
  return createGestureController('week-pan');
}

/** A sideways drag of dx, released at velocity vx (px/s). */
async function drag(pan: ReturnType<typeof createGestureController>, dx: number, vx = 0) {
  await act(() => pan.begin({ translationX: 0 }));
  await act(() => pan.activate({ translationX: dx / 2 }));
  await act(() => pan.update({ translationX: dx, velocityX: vx }));
  await act(() => pan.end({ translationX: dx, velocityX: vx }));
  await advance(SETTLED_MS);
}

const dayText = () => screen.getByTestId('calendar-day');

beforeEach(() => {
  jest.useFakeTimers();
  resetEvents();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('My calendar', () => {
  test('opens on today: month, picked day with its count, my events and the now line', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'October 2026' })).toBeOnTheScreen();
    expect(dayText()).toHaveTextContent('Wednesday, Oct 7, 2026 · 2 events');
    expect(screen.getByTestId('week-day-2026-10-07')).toBeSelected();
    expect(screen.getByTestId('calendar-block-daily')).toBeOnTheScreen();
    expect(screen.getByTestId('calendar-block-review').props.className).toContain('bg-accent');
    expect(screen.getByTestId('calendar-block-daily').props.className).toContain('bg-info-soft');
    expect(screen.getByTestId('now-line', { includeHiddenElements: true })).toHaveTextContent(
      '9:41',
      {
        exact: false,
      },
    );
  });

  test('picking another day shows its events and drops the now line', async () => {
    await open();
    await fireEvent.press(screen.getByLabelText('Monday, Oct 5, 2026'));
    expect(dayText()).toHaveTextContent('Monday, Oct 5, 2026 · No events');
    expect(screen.queryByTestId('now-line', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  test('an event block opens the event', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('calendar-block-review'));
    expect(router.push).toHaveBeenCalledWith('/events/review');
  });

  test('a long drag left pages to the next week; right goes back', async () => {
    const pan = await open();
    await drag(pan, -150);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 14, 2026/);
    expect(screen.getByTestId('week-day-2026-10-11')).toBeOnTheScreen();
    await drag(pan, 150);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
  });

  test('a short slow drag springs back; a short flick pages', async () => {
    const pan = await open();
    await drag(pan, -40);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
    await drag(pan, -30, -800);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 14, 2026/);
  });

  test('screen readers page with the adjustable actions', async () => {
    await open();
    const strip = screen.getByRole('adjustable', { name: 'Week' });
    await fireEvent(strip, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(dayText()).toHaveTextContent(/^Wednesday, Sep 30, 2026/);
    await fireEvent(strip, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
  });
});
