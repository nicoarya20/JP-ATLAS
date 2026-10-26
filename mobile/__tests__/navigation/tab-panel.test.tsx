// The More panel's motion (prototype .tb-shell / .tb-rise, docs/phase1-navigation.md §2.5): it unfolds to its
// content's height while the shell swells once, its children rise in one after another, and folding is faster. Router
// wiring is covered in tab-bar.more.test.tsx, whose Reanimated is mocked.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { PanelRise } from '../../src/components/tab-bar/panel-rise';
import { PANEL } from '../../src/components/tab-bar/tab-bar.motion';
import { TabShell } from '../../src/components/tab-bar/tab-panel';

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

/** test-only: the panel content's measured height. */
const CONTENT_HEIGHT = 240;
const SETTLED_MS = 1000;

/** Run animation frames for `ms` (one frame at a time, as the device would). */
const FRAME_MS = 16;
const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });

type Style = {
  height?: number;
  opacity?: number;
  transform?: Record<string, number>[];
};
// TypeScript resolves Reanimated's jest utils to their web stub (typed `() => void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (element: {
  props: Record<string, unknown>;
}) => Style;
const transformOf = (element: { props: Record<string, unknown> }) =>
  Object.assign({}, ...(getAnimatedStyle(element).transform ?? [])) as Record<string, number>;

const height = () =>
  getAnimatedStyle(screen.getByTestId('tab-panel', { includeHiddenElements: true })).height;
const swell = () =>
  transformOf(screen.getByTestId('tab-shell-swell', { includeHiddenElements: true }));
/** The rising wrapper (PanelRise) of panel child `i`. */
const rise = (i: number) => {
  const wrapper = screen.getByTestId(`child-${i}`, { includeHiddenElements: true }).parent;
  if (!wrapper) throw new Error(`child-${i} has no PanelRise around it`);
  return { opacity: getAnimatedStyle(wrapper).opacity, ...transformOf(wrapper) };
};

const Shell = ({ open }: { open: boolean }) => (
  <TabShell
    open={open}
    label="More"
    onEscape={jest.fn()}
    panel={[0, 1, 2].map((i) => (
      <PanelRise key={i} i={i}>
        <Text testID={`child-${i}`}>Child {i}</Text>
      </PanelRise>
    ))}
  >
    <Text>pill</Text>
  </TabShell>
);

async function mount() {
  const view = await render(<Shell open={false} />);
  await fireEvent(
    screen.getByTestId('tab-panel-content', { includeHiddenElements: true }),
    'layout',
    {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: CONTENT_HEIGHT } },
    },
  );
  await advance(FRAME_MS);
  return view;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  reducedMotion.mockReturnValue(false);
});

describe('More panel motion', () => {
  it('rests folded: no height, children down and faded', async () => {
    await mount();
    await advance(SETTLED_MS);

    expect(height()).toBe(0);
    expect(rise(0)).toEqual({ opacity: 0, translateY: PANEL.rise.y, scale: PANEL.rise.scale });
  });

  it('unfolds to its content with one swell, then folds back faster', async () => {
    const view = await mount();

    await view.rerender(<Shell open />);
    await advance(PANEL.openMs / 2);
    const half = height() ?? 0;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(CONTENT_HEIGHT);
    expect(swell().scaleX).not.toBe(1); // mid-swell
    await advance(PANEL.swellMs);
    expect(height()).toBe(CONTENT_HEIGHT);
    expect(swell()).toEqual({ scaleX: 1, scaleY: 1 });

    await view.rerender(<Shell open={false} />);
    await advance(PANEL.closeMs + FRAME_MS);
    expect(height()).toBe(0);
    expect(swell()).toEqual({ scaleX: 1, scaleY: 1 }); // folding does not swell
  });

  it('floats each child in after the one before', async () => {
    const view = await mount();

    await view.rerender(<Shell open />);
    // past child 0's start, before child 2's
    await advance(PANEL.rise.delayMs + PANEL.rise.stepMs);
    expect(rise(0).opacity).toBeGreaterThan(0);
    expect(rise(2).opacity).toBe(0);
    await advance(SETTLED_MS);
    expect(rise(2)).toEqual({ opacity: 1, translateY: 0, scale: 1 });

    await view.rerender(<Shell open={false} />);
    await advance(PANEL.rise.closeMoveMs + FRAME_MS);
    expect(rise(2)).toEqual({ opacity: 0, translateY: PANEL.rise.y, scale: PANEL.rise.scale });
  });

  it('follows its content when the text size changes while open', async () => {
    const view = await mount();
    await view.rerender(<Shell open />);
    await advance(SETTLED_MS);

    await fireEvent(screen.getByTestId('tab-panel-content'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: CONTENT_HEIGHT + 60 } },
    });
    await advance(FRAME_MS);

    expect(height()).toBe(CONTENT_HEIGHT + 60);
  });

  it('only unfolds and fades, without swell or rise, when the system asks for reduced motion', async () => {
    reducedMotion.mockReturnValue(true);
    const view = await mount();

    await view.rerender(<Shell open />);
    await advance(FRAME_MS * 4);
    expect(swell()).toEqual({ scaleX: 1, scaleY: 1 });
    expect(rise(2)).toMatchObject({ translateY: 0, scale: 1 });
    expect(rise(2).opacity).toBeGreaterThan(0); // no stagger delay either
    await advance(SETTLED_MS);
    expect(height()).toBe(CONTENT_HEIGHT);
    expect(rise(2).opacity).toBe(1);
  });
});
