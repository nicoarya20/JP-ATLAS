import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createStore, useStore } from '../../src/data/store';

type Counter = { n: number; items: readonly string[] };

describe('createStore', () => {
  test('get, set a value or an updater, reset to the initial state', () => {
    const initial: Counter = { n: 0, items: [] };
    const store = createStore(initial);
    store.set({ n: 1, items: ['a'] });
    store.set((prev) => ({ ...prev, n: prev.n + 1 }));
    expect(store.get()).toEqual({ n: 2, items: ['a'] });
    store.reset();
    expect(store.get()).toBe(initial);
  });

  test('listeners run once per change, not when the state stays the same, and stop after unsubscribe', () => {
    const store = createStore(1);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(2);
    store.set(2);
    store.set((n) => n);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('useStore', () => {
  const store = createStore<Counter>({ n: 0, items: ['a', 'b'] });
  afterEach(() => store.reset());

  function Count() {
    const n = useStore(store, (s) => s.n);
    return <Text>Count {n}</Text>;
  }

  function Upper() {
    // A selector that builds a new array each call must not loop.
    const items = useStore(store, (s) => s.items.map((i) => i.toUpperCase()));
    return <Text>{items.join(',')}</Text>;
  }

  test('re-renders with the selected value when the store changes', async () => {
    await render(<Count />);
    expect(screen.getByText('Count 0')).toBeOnTheScreen();
    await act(async () => store.set((s) => ({ ...s, n: 5 })));
    expect(screen.getByText('Count 5')).toBeOnTheScreen();
  });

  test('a selector returning a new array renders stably and follows changes', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await render(<Upper />);
    expect(screen.getByText('A,B')).toBeOnTheScreen();
    await act(async () => store.set((s) => ({ ...s, items: [...s.items, 'c'] })));
    expect(screen.getByText('A,B,C')).toBeOnTheScreen();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  test('without a selector it returns the whole state', async () => {
    function Whole() {
      const s = useStore(store);
      return <Text>{`${s.n}:${s.items.length}`}</Text>;
    }
    await render(<Whole />);
    expect(screen.getByText('0:2')).toBeOnTheScreen();
  });
});
