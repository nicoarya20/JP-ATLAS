// My calendar against a stubbed `/api/app/events?from&to`: the week it asks for, the blocks it
// places, and the week strip's drag. The prototype's "now" line is gone — the server's clock
// carries today's date and the team zone but no instant to draw a line at.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { CalendarScreen } from '../../src/screens/profile/calendar.screen';
import { listItem, page } from '../helpers/events-server';
import { type Reply, serveAppApi } from '../helpers/team-trash-server';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// test-only: a 350 px strip, so a page needs 87.5 px of drag.
const STRIP_PX = 350;
const FRAME_MS = 16;
/** Longer than the 220 ms slide. */
const SETTLED_MS = 400;

/** Two of my events on Wednesday 7 Oct, in the team's zone: 09:00–10:00 and 14:00–15:00. */
const MINE = page([
  listItem({
    id: 'daily',
    kind: 'meeting',
    startsAt: '2026-10-07T02:00:00.000Z',
    endsAt: '2026-10-07T03:00:00.000Z',
  }),
  listItem({ id: 'review' }),
]);

let events: Reply = { body: MINE };

const server = serveAppApi(({ path }) => {
  if (path === '/api/app/events') return events;
  return { status: 500, body: { error: `no stub for ${path}`, code: 'X', status: 500 } };
});

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
  await render(<CalendarScreen />, { wrapper: Providers });
  // The week is asked for on mount; let it answer before anything is asserted.
  await act(async () => {});
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
  await act(async () => {});
}

const dayText = () => screen.getByTestId('calendar-day');

beforeEach(() => {
  jest.useFakeTimers();
  events = { body: MINE };
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('My calendar', () => {
  it('asks for the week it shows, once', async () => {
    await open();
    const asked = server.to('/api/app/events').map((c) => Object.fromEntries(c.search));
    expect(asked).toEqual([{ from: '2026-10-04', to: '2026-10-10', limit: '100' }]);
  });

  it('opens on today: the month, the picked day with its count, and my blocks', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'October 2026' })).toBeOnTheScreen();
    expect(dayText()).toHaveTextContent('Wednesday, Oct 7, 2026 · 2 events');
    expect(screen.getByTestId('week-day-2026-10-07')).toBeSelected();
    expect(screen.getByTestId('calendar-block-daily')).toBeOnTheScreen();
    expect(screen.getByTestId('calendar-block-review').props.className).toContain('bg-accent');
    expect(screen.getByTestId('calendar-block-daily').props.className).toContain('bg-info-soft');
  });

  it('draws no "now" line, because the server sends no instant to put one at', async () => {
    await open();
    expect(screen.queryByTestId('now-line', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('shows another day of the same week without asking again', async () => {
    await open();
    await fireEvent.press(screen.getByLabelText('Monday, Oct 5, 2026'));
    expect(dayText()).toHaveTextContent('Monday, Oct 5, 2026 · No events');
    expect(server.to('/api/app/events')).toHaveLength(1);
  });

  it('runs the hours from 12 AM, which is shown too', async () => {
    await open();
    expect(screen.getByText('12 AM')).toBeOnTheScreen();
    expect(screen.getByText('1 AM')).toBeOnTheScreen();
  });

  it('gives every block a 44 pt touch target', async () => {
    await open();
    for (const block of screen.getAllByTestId(/^calendar-block-/)) {
      const { height } = block.props.style;
      const slop = block.props.hitSlop ?? { top: 0, bottom: 0 };
      expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    }
  });

  it('opens the event a block stands for', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('calendar-block-review'));
    expect(router.push).toHaveBeenCalledWith('/events/review');
  });

  it('pages to the next week on a long drag left, and asks for that week', async () => {
    const pan = await open();
    events = { body: page([]) };
    await drag(pan, -150);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 14, 2026/);
    expect(screen.getByTestId('week-day-2026-10-11')).toBeOnTheScreen();
    expect(server.to('/api/app/events').at(-1)?.search.get('from')).toBe('2026-10-11');
    await drag(pan, 150);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
  });

  it('springs back on a short slow drag, and pages on a short flick', async () => {
    const pan = await open();
    await drag(pan, -40);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
    await drag(pan, -30, -800);
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 14, 2026/);
  });

  it('keeps each day its own button, and pages with a named action', async () => {
    await open();
    expect(screen.queryByRole('adjustable')).not.toBeOnTheScreen();
    const days = screen.getAllByTestId(/^week-day-/);
    expect(days).toHaveLength(7);
    for (const day of days) expect(day).toHaveProp('accessibilityRole', 'button');
    expect(days[0].props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Previous week',
      'Next week',
    ]);
    const paged = (iso: string, actionName: string) =>
      fireEvent(screen.getByTestId(`week-day-${iso}`), 'accessibilityAction', {
        nativeEvent: { actionName },
      });
    await paged('2026-10-07', 'previous-week');
    expect(dayText()).toHaveTextContent(/^Wednesday, Sep 30, 2026/);
    await paged('2026-09-30', 'next-week');
    expect(dayText()).toHaveTextContent(/^Wednesday, Oct 7, 2026/);
  });

  it("shows the server's own sentence when the week cannot be read", async () => {
    events = { status: 500, body: { error: 'Ada yang salah.', code: 'INTERNAL', status: 500 } };
    await open();
    expect(screen.getByText('Ada yang salah.')).toBeOnTheScreen();
    expect(screen.queryByTestId('day-grid')).not.toBeOnTheScreen();
  });
});
