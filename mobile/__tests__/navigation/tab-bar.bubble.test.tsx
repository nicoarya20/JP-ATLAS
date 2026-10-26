// Port of the prototype's src/test/tabbar.bubble.test.jsx: a tap slides the bubble to the tab with a bounce, a held
// finger drags it, release picks the nearest tab. Router wiring is covered in __tests__/tabs.test.tsx.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import * as Reanimated from 'react-native-reanimated';

import { GlassPill } from '../../src/components/tab-bar/glass-pill';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { TABS } from '../../src/navigation/tabs.config';

// The system's reduce-motion setting, switched per test.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useReducedMotion: jest.fn(() => false),
  };
});
const reducedMotion = Reanimated.useReducedMotion as jest.Mock;

const TAB = { home: 0, tasks: 1, projects: 2, events: 3, more: 4 } as const;
// test-only layout: a 308 px pill, so each of the 5 tabs is 60 px wide inside the 4 px padding.
const PILL_WIDTH = 308;
const TAB_WIDTH = 60;
/** Finger x over each tab's middle. */
const over = (i: number) => 4 + TAB_WIDTH * i + TAB_WIDTH / 2;

/** The tab bar's owner: More's press is taken over (it opens a panel), every other pick becomes the active tab. */
function Owner({ start, onPick }: { start: number; onPick: jest.Mock }) {
  const [active, setActive] = useState(start);
  const pick = (i: number) => {
    onPick(i);
    if (i === TAB.more) return false;
    setActive(i);
    return true;
  };
  return <GlassPill tabs={TABS} active={active} onPick={pick} />;
}

const Providers = ({ children }: { children: React.ReactNode }) => (
  <GestureHandlerRootView>
    <GluestackUIProvider>{children}</GluestackUIProvider>
  </GestureHandlerRootView>
);

/** Run animation frames for `ms` (one frame at a time, as the device would). */
const FRAME_MS = 16;
const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });

/** Lay the pill out at PILL_WIDTH; styles and calls back to JS land on the next frame. */
async function layOut() {
  await fireEvent(screen.getByTestId('tab-bar'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: PILL_WIDTH, height: 58 } },
  });
  await advance(FRAME_MS);
}

async function open(start: number = TAB.home) {
  const onPick = jest.fn();
  await render(<Owner start={start} onPick={onPick} />, { wrapper: Providers });
  await layOut();
  return { onPick, pan: createGestureController('tab-pan') };
}
/** Long enough for any bubble motion (the jelly, 600 ms, is the longest) to finish. */
const SETTLED_MS = 1000;

type Transform = { translateX: number; scaleX: number; scaleY: number; scale: number };
// TypeScript resolves Reanimated's jest utils to their web stub (typed `() => void`); jest runs the native one, which
// takes a rendered element. Typed here to what it returns.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (element: {
  props: Record<string, unknown>;
}) => { transform: Partial<Transform>[] };
const transformOf = (testID: string): Partial<Transform> =>
  Object.assign({}, ...getAnimatedStyle(screen.getByTestId(testID)).transform);
/** The bubble's place in tabs (0 = Home) and its squash. */
const bubble = () => {
  const { translateX = 0, scaleX, scaleY } = transformOf('tab-bubble');
  return { pos: translateX / TAB_WIDTH, scaleX, scaleY };
};
/** Tabs whose icon wears the accent: the one under the bubble. */
const lit = () =>
  TABS.filter((t) => {
    const [icon] = screen.getByTestId(`tab-${t.id}-icon`).children;
    return typeof icon === 'object' && String(icon.props.className).includes('text-atlas');
  }).map((t) => t.label);
const tab = (name: string) => screen.getByRole('tab', { name });

/** A tap: the finger goes down and up without moving, so the pan never activates (it fails on lift). */
async function tap(pan: ReturnType<typeof createGestureController>, x: number) {
  await act(() => pan.begin({ x }));
  await lift(() => pan.fail({ x }));
}

/** End a gesture; its release reaches JS a frame later. */
async function lift(end: () => void) {
  await act(end);
  await advance(FRAME_MS);
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  reducedMotion.mockReturnValue(false);
});

describe('tab bar bubble', () => {
  it('rests behind the active tab', async () => {
    await open(TAB.projects);

    expect(bubble()).toEqual({ pos: 2, scaleX: 1, scaleY: 1 });
    expect(lit()).toEqual(['Projects']);
    expect(tab('Projects')).toBeSelected();
  });

  it('settles on a tapped tab with a bounce', async () => {
    const { onPick, pan } = await open();

    await tap(pan, over(TAB.events));
    expect(onPick).toHaveBeenCalledWith(TAB.events);
    expect(tab('Events')).toBeSelected();

    await advance(200); // a third into the jelly: squashed flat
    expect(bubble().scaleY).toBeLessThan(1);
    await advance(SETTLED_MS);
    expect(bubble()).toEqual({ pos: 3, scaleX: 1, scaleY: 1 });
    expect(lit()).toEqual(['Events']);
  });

  it('bounces in place when the active tab is tapped again', async () => {
    const { onPick, pan } = await open(TAB.tasks);

    await tap(pan, over(TAB.tasks));
    // The owner still hears the press (a tab's listener may scroll its screen to the top).
    expect(onPick).toHaveBeenCalledWith(TAB.tasks);
    await advance(200);
    expect(bubble().scaleY).toBeLessThan(1);
    await advance(SETTLED_MS);
    expect(bubble()).toEqual({ pos: 1, scaleX: 1, scaleY: 1 });
  });

  it('jumps under the finger, follows a drag and opens the tab it is released on', async () => {
    const { onPick, pan } = await open();

    await act(() => pan.begin({ x: over(TAB.tasks) }));
    await advance(SETTLED_MS);
    // finger on Tasks: the bubble jumps there and lifts, its icon lit and grown
    expect(bubble()).toEqual({ pos: 1, scaleX: 1.16, scaleY: 1.12 });
    expect(lit()).toEqual(['Tasks']);
    expect(transformOf('tab-tasks-icon').scale).toBe(1.12);

    await act(() => pan.activate({ x: over(TAB.tasks) }));
    await act(() => pan.update({ x: over(TAB.events) }));
    await advance(SETTLED_MS);
    expect(bubble().pos).toBeCloseTo(3);
    expect(lit()).toEqual(['Events']); // the icon under the bubble lights up while dragging
    expect(onPick).not.toHaveBeenCalled();

    await lift(() => pan.end({ x: over(TAB.events) }));
    expect(onPick).toHaveBeenCalledWith(TAB.events);
    expect(tab('Events')).toBeSelected();
    await advance(SETTLED_MS);
    expect(bubble()).toEqual({ pos: 3, scaleX: 1, scaleY: 1 });
  });

  // On a device the tab change comes back from JS only after the new screen has rendered (about 300 ms in a dev build);
  // the bubble used to stand still until then.
  it('settles on release without waiting for the tab change, and does not bounce again when it comes', async () => {
    const TAB_CHANGE_MS = 300;
    function SlowOwner() {
      const [active, setActive] = useState<number>(TAB.home);
      const pick = (i: number) => {
        setTimeout(() => setActive(i), TAB_CHANGE_MS);
        return true;
      };
      return <GlassPill tabs={TABS} active={active} onPick={pick} />;
    }
    await render(<SlowOwner />, { wrapper: Providers });
    await layOut();

    await tap(createGestureController('tab-pan'), over(TAB.events));
    await advance(200); // the tab has not changed yet
    expect(tab('Home')).toBeSelected();
    expect(bubble().pos).toBeGreaterThan(1);
    expect(bubble().scaleY).toBeLessThan(1);

    // 700 ms after release: the bounce that started then is over; one started by the tab change would still run.
    await advance(500);
    expect(tab('Events')).toBeSelected();
    expect(bubble()).toEqual({ pos: 3, scaleX: 1, scaleY: 1 });
  });

  it('picks the tab under the finger even while the bubble is still sliding there', async () => {
    const { onPick, pan } = await open();

    await tap(pan, over(TAB.more) - 20);

    expect(onPick).toHaveBeenCalledWith(TAB.more);
  });

  it('keeps the bubble inside the pill when dragged past the edge', async () => {
    const { onPick, pan } = await open();

    await act(() => pan.begin({ x: 30 }));
    await act(() => pan.activate({ x: 30 }));
    await act(() => pan.update({ x: 900 }));
    await advance(SETTLED_MS);
    expect(bubble().pos).toBe(4);

    // a drag the system cancels goes back to the active tab
    await lift(() => pan.cancel({ x: 900 }));
    await advance(SETTLED_MS);
    expect(onPick).not.toHaveBeenCalled();
    expect(bubble()).toEqual({ pos: 0, scaleX: 1, scaleY: 1 });
    expect(lit()).toEqual(['Home']);
  });

  it('goes back to the active tab when the pick is taken over (More opens a panel)', async () => {
    const { onPick, pan } = await open(TAB.projects);

    await tap(pan, over(TAB.more));
    await advance(SETTLED_MS);

    expect(onPick).toHaveBeenCalledWith(TAB.more);
    expect(tab('Projects')).toBeSelected();
    expect(bubble()).toEqual({ pos: 2, scaleX: 1, scaleY: 1 });
  });

  // The slide only plays if the same bubble survives the tab change.
  it('keeps one bubble across tab changes so it can slide instead of reappearing', async () => {
    const { pan } = await open();
    const first = screen.getByTestId('tab-bubble');

    await tap(pan, over(TAB.tasks));
    await tap(pan, over(TAB.events));
    await advance(SETTLED_MS);

    expect(screen.getByTestId('tab-bubble')).toBe(first);
    expect(bubble().pos).toBe(3);
  });

  it('slides too when a link on the screen changes the tab', async () => {
    const pick = jest.fn(() => true);
    const view = await render(<GlassPill tabs={TABS} active={TAB.home} onPick={pick} />, {
      wrapper: Providers,
    });
    await layOut();
    const first = screen.getByTestId('tab-bubble');

    await view.rerender(<GlassPill tabs={TABS} active={TAB.tasks} onPick={pick} />);
    await advance(200);
    expect(bubble().scaleY).toBeLessThan(1); // the bounce plays for a change from anywhere
    await advance(SETTLED_MS);

    expect(bubble()).toEqual({ pos: 1, scaleX: 1, scaleY: 1 });
    expect(screen.getByTestId('tab-bubble')).toBe(first);
    expect(pick).not.toHaveBeenCalled();
  });

  it('picks a tab from a screen reader with the activate action', async () => {
    const { onPick } = await open();

    await fireEvent(tab('Projects'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    expect(onPick).toHaveBeenCalledWith(TAB.projects);
    expect(tab('Projects')).toBeSelected();
  });

  it('only slides, without lift or bounce, when the system asks for reduced motion', async () => {
    reducedMotion.mockReturnValue(true);
    const { pan } = await open();

    await act(() => pan.begin({ x: over(TAB.tasks) }));
    await advance(SETTLED_MS);
    expect(bubble()).toEqual({ pos: 1, scaleX: 1, scaleY: 1 });

    await lift(() => pan.fail({ x: over(TAB.tasks) }));
    expect(bubble().scaleY).toBe(1);
    await advance(SETTLED_MS);
    expect(bubble()).toEqual({ pos: 1, scaleX: 1, scaleY: 1 });
  });
});
