// The "+" folding away and back (docs/phase1-navigation.md §2.4, §2.8; prototype styles/app.css .glassbar-fab), on the
// component alone: router tests run with expo-router's Reanimated mock, which does not animate.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { CreateFab } from '../../src/components/tab-bar/create-fab';
import { CREATE } from '../../src/navigation/tab-create';

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

type Fold = { width: number; marginLeft: number; opacity: number; transform: { scale: number }[] };
// TypeScript resolves Reanimated's jest utils to their web stub (typed `() => void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (element: {
  props: Record<string, unknown>;
}) => Fold;
// Folded, the "+" is hidden from screen readers, which queries skip by default.
const fab = () => screen.getByTestId('create-fab', { includeHiddenElements: true });
const fold = () => {
  const { width, marginLeft, opacity, transform } = getAnimatedStyle(fab());
  return { width, marginLeft, opacity, scale: transform[0].scale };
};

const OPEN = { width: 60, marginLeft: 10, opacity: 1, scale: 1 };
const FOLDED = { width: 0, marginLeft: 0, opacity: 0, scale: 0.6 };
const TASK = CREATE.tasks ?? null;

const FRAME_MS = 16;
const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });
/** Longer than any fold step (380 ms, or 120 + 220 ms for the delayed fade). */
const DONE_MS = 600;

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  reducedMotion.mockReturnValue(false);
});

describe('create "+" fold', () => {
  it('mounts open or folded without animating', async () => {
    const view = await render(<CreateFab target={TASK} />);
    expect(fold()).toEqual(OPEN);

    await view.unmount();
    await render(<CreateFab target={null} />);
    expect(fold()).toEqual(FOLDED);
  });

  it('folds: fades out fast while it narrows', async () => {
    const view = await render(<CreateFab target={TASK} />);

    await view.rerender(<CreateFab target={null} />);
    await advance(128);
    const mid = fold();
    expect(mid.opacity).toBeLessThan(0.5); // a 160 ms fade, well ahead of the 380 ms width
    expect(mid.width).toBeGreaterThan(0);
    expect(mid.width).toBeLessThan(60);

    await advance(DONE_MS);
    expect(fold()).toEqual(FOLDED);
  });

  it('unfolds: makes room first, then fades in after 120 ms', async () => {
    const view = await render(<CreateFab target={null} />);

    await view.rerender(<CreateFab target={TASK} />);
    await advance(96);
    const early = fold();
    expect(early.opacity).toBe(0);
    expect(early.width).toBeGreaterThan(0);

    await advance(DONE_MS);
    expect(fold()).toEqual(OPEN);
  });

  it('only fades, briefly, when the system asks for reduced motion', async () => {
    reducedMotion.mockReturnValue(true);
    const view = await render(<CreateFab target={TASK} />);

    await view.rerender(<CreateFab target={null} />);
    await advance(FRAME_MS);
    expect(fold()).toMatchObject({ width: 0, marginLeft: 0, scale: 1 });

    await advance(200); // the 120 ms fade
    expect(fold()).toEqual({ ...FOLDED, scale: 1 });
  });

  it('shrinks a little while pressed', async () => {
    await render(<CreateFab target={TASK} />);
    const button = screen.getByRole('button', { name: 'New task' });

    await fireEvent(button, 'pressIn');
    await advance(DONE_MS);
    expect(fold().scale).toBeCloseTo(0.94);

    await fireEvent(button, 'pressOut');
    await advance(DONE_MS);
    expect(fold().scale).toBe(1);
  });
});
