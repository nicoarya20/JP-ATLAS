// Profile ② My calendar against a stubbed `GET /api/app/events?from=<Sunday>&to=<Saturday>`: one read per week, my
// events on the picked day, a canceled one drawn as such, the week strip's swipe and its named actions.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import type { EventListItemWire } from '../../src/data/events.wire';
import { forgetAllResources } from '../../src/data/resource';
import { CalendarScreen } from '../../src/screens/profile/calendar.screen';
import { serveAuth } from '../helpers/auth-server';
import { eventsPage, reviewItem, syncItem } from '../helpers/events-fixtures';
import { Providers } from '../helpers/providers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// test-only: a 350 px strip, so a page needs 87.5 px of drag.
const STRIP_PX = 350;
const FRAME_MS = 16;
/** Longer than the 220 ms slide. */
const SETTLED_MS = 400;

/** This week: a stand-up and the review today (one canceled), the sync tomorrow; nothing in other weeks. */
const THIS_WEEK: EventListItemWire[] = [
  reviewItem(),
  reviewItem({
    id: 'e-daily',
    title: 'Atlas daily stand-up',
    kind: 'meeting',
    startsAt: '2026-10-07T02:00:00.000Z',
    endsAt: '2026-10-07T02:15:00.000Z',
  }),
  reviewItem({
    id: 'e-retro',
    title: 'Retro',
    kind: 'team',
    startsAt: '2026-10-07T09:00:00.000Z',
    endsAt: '2026-10-07T10:00:00.000Z',
    canceledAt: '2026-10-06T01:00:00.000Z',
  }),
  syncItem(),
];

let server: ReturnType<typeof serveAuth> | null = null;
const weeks = () =>
  (server?.calls ?? [])
    .filter((u) => u.includes('/api/app/events?'))
    .map((u) => {
      const q = new URL(u).searchParams;
      return `${q.get('from')}..${q.get('to')}`;
    });

const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });

async function open() {
  server = serveAuth({
    '/api/app/events?': (url) => ({
      body: eventsPage(new URL(url).searchParams.get('from') === '2026-10-04' ? THIS_WEEK : []),
    }),
  });
  await render(<CalendarScreen />, { wrapper: Providers });
  await screen.findByText(/· 3 events$/);
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
  forgetAllResources();
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
  server?.restore();
  server = null;
});

describe('My calendar', () => {
  test('opens on today: month, picked day with its count, my events by kind, a canceled one struck', async () => {
    await open();
    expect(weeks()).toEqual(['2026-10-04..2026-10-10']);
    expect(screen.getByRole('header', { name: 'October 2026' })).toBeOnTheScreen();
    expect(dayText()).toHaveTextContent('Wednesday, Oct 7, 2026 · 3 events');
    expect(screen.getByTestId('week-day-2026-10-07')).toBeSelected();
    expect(screen.getByTestId('calendar-block-e-review').props.className).toContain('bg-accent');
    expect(screen.getByTestId('calendar-block-e-daily').props.className).toContain('bg-info-soft');
    expect(screen.getByTestId('calendar-block-e-retro').props.className).toContain('opacity-60');
    expect(
      screen.getByText('Canceled · 4:00–5:00 PM · In person · Meeting Room 2'),
    ).toBeOnTheScreen();
    // The server sends no "now": no now line.
    expect(screen.queryByTestId('now-line', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  test('picking another day shows its events from the same read', async () => {
    await open();
    await fireEvent.press(screen.getByLabelText('Thursday, Oct 8, 2026'));
    expect(dayText()).toHaveTextContent('Thursday, Oct 8, 2026 · 1 event');
    await fireEvent.press(screen.getByLabelText('Monday, Oct 5, 2026'));
    expect(dayText()).toHaveTextContent('Monday, Oct 5, 2026 · No events');
    expect(weeks()).toHaveLength(1);
  });

  test('a failed read says why, with Try again', async () => {
    server = serveAuth({
      '/api/app/events?': {
        status: 503,
        body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
      },
    });
    await render(<CalendarScreen />, { wrapper: Providers });
    expect(dayText()).toHaveTextContent('Wednesday, Oct 7, 2026 · Loading…');
    expect(await screen.findByTestId('calendar-failed')).toBeOnTheScreen();
    expect(screen.getByText('Sedang pemeliharaan.')).toBeOnTheScreen();
  });

  test('the hours run from 12 AM, which is shown too', async () => {
    await open();
    expect(screen.getByText('12 AM')).toBeOnTheScreen();
    expect(screen.getByText('1 AM')).toBeOnTheScreen();
  });

  test('every event block reaches a 44 pt touch target', async () => {
    await open();
    for (const block of screen.getAllByTestId(/^calendar-block-/)) {
      const { height } = block.props.style;
      const slop = block.props.hitSlop ?? { top: 0, bottom: 0 };
      expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    }
  });

  test('an event block opens the event', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('calendar-block-e-review'));
    expect(router.push).toHaveBeenCalledWith('/events/e-review');
  });

  test('a long drag left pages to the next week; right goes back', async () => {
    const pan = await open();
    await drag(pan, -150);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 14, 2026/);
    expect(screen.getByTestId('week-day-2026-10-11')).toBeOnTheScreen();
    expect(await screen.findByText('Wednesday, Oct 14, 2026 · No events')).toBeOnTheScreen();
    expect(weeks()).toEqual(['2026-10-04..2026-10-10', '2026-10-11..2026-10-17']);
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

  test('each day stays its own button, and pages with a named action', async () => {
    await open();
    expect(screen.queryByRole('adjustable')).not.toBeOnTheScreen();
    const days = screen.getAllByTestId(/^week-day-/);
    expect(days).toHaveLength(7);
    for (const day of days) expect(day).toHaveProp('accessibilityRole', 'button');
    expect(days[0].props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Previous week',
      'Next week',
    ]);
    const page = (iso: string, actionName: string) =>
      fireEvent(screen.getByTestId(`week-day-${iso}`), 'accessibilityAction', {
        nativeEvent: { actionName },
      });
    await page('2026-10-07', 'previous-week');
    expect(dayText()).toHaveTextContent(/^Wednesday, Sep 30, 2026/);
    await page('2026-09-30', 'next-week');
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
  });
});
