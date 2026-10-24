import { act } from '@testing-library/react-native';

// A gluestack toast hides itself with a setTimeout(duration) that nothing clears. Left pending when a test ends, it
// outlives the test file and keeps the jest worker from exiting. Covers gluestack's default 5 s plus the 150 ms exit
// animation (Notice uses 3 s). Two passes: hiding is a state update, and the exit animation is scheduled after it.
const TOAST_LIFETIME_MS = 6000;

/**
 * Opt-in for test files that show a toast: fake timers for each test, then every pending toast runs out before real
 * timers come back. Call once at the top level of the file. (Not a timer count: Reanimated keeps a frame timer.)
 */
export function drainToastTimers() {
  beforeEach(() => jest.useFakeTimers());

  afterEach(async () => {
    await act(async () => jest.advanceTimersByTime(TOAST_LIFETIME_MS));
    await act(async () => jest.advanceTimersByTime(TOAST_LIFETIME_MS));
    jest.useRealTimers();
  });
}
