/**
 * The two facts about Expo Router that the whole Phase 2 data layer rests on, as assertions.
 *
 * Phase 2 keeps `get<Module>()` synchronous and lets a fetch layer fill the stores (the user's
 * decision, 26 Oct 2026). That only works if a global store really does reach a screen the router
 * has moved on from — and that had never been checked against the running router, only assumed.
 * It holds, so these tests are here to notice if a router upgrade ever changes it: the day they
 * fail, `src/data/resource.ts` needs a focus-driven refresh instead of plain invalidation.
 */
import { act, screen } from '@testing-library/react-native';
import { Link, router, Stack, Tabs } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { createStore, useStore } from '@/data/store';

const probe = createStore('first');

/** Mount/unmount and render bookkeeping of one screen, so the test can see what the router did. */
const log: string[] = [];

function Watcher({ id }: { id: string }) {
  const value = useStore(probe);
  const renders = useRef(0);
  renders.current += 1;
  log.push(`render:${id}:${value}`);
  // Mount-only on purpose, `id` left out: the absence of a re-run is what these tests assert.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount bookkeeping, see above
  useEffect(() => {
    log.push(`mount:${id}`);
    return () => {
      log.push(`unmount:${id}`);
    };
  }, []);
  return (
    <View>
      <Text testID={`value-${id}`}>{value}</Text>
      <Link testID={`to-b-${id}`} href="/b">
        b
      </Link>
      <Link testID={`to-t2-${id}`} href="/t2">
        t2
      </Link>
    </View>
  );
}

const press = async (testID: string) => {
  await act(async () => {
    screen.getByTestId(testID).props.onPress?.({});
  });
};

beforeEach(() => {
  probe.reset();
  log.length = 0;
});

describe('a global store across Expo Router navigation', () => {
  it('keeps the screen behind a pushed one mounted, and writes reach it while it is not on top', async () => {
    await renderRouter(
      { _layout: () => <Stack />, a: () => <Watcher id="a" />, b: () => <Watcher id="b" /> },
      { initialUrl: '/a' },
    );
    await press('to-b-a');

    expect(log).toContain('mount:b');
    // Fact 1: navigating away does not unmount, so a `useEffect(…, [])` fetch on /a will not run
    // again when it comes back — nothing else would refresh it, which is why invalidate() refetches.
    expect(log).not.toContain('unmount:a');

    await act(async () => {
      probe.set('second');
    });

    // Fact 2: the store reaches a screen that is not on top. The subscription outlives the focus,
    // so one write updates every live screen at once — and a store left stale would be wrong on
    // all of them, not just the visible one.
    expect(log).toContain('render:a:second');
  });

  it('shows the written value when the pushed screen is popped, without fetching again', async () => {
    await renderRouter(
      { _layout: () => <Stack />, a: () => <Watcher id="a" />, b: () => <Watcher id="b" /> },
      { initialUrl: '/a' },
    );
    await press('to-b-a');
    await act(async () => {
      probe.set('second');
    });
    log.length = 0;
    await act(async () => {
      router.back();
    });

    expect(log).toContain('unmount:b');
    // /a was never remounted, so it never re-ran its effect: no second request, and no stale frame.
    expect(log).not.toContain('mount:a');
    expect(screen.getByTestId('value-a')).toHaveTextContent('second');
  });

  it('does the same between tabs: the hidden tab stays mounted and follows the store', async () => {
    await renderRouter(
      {
        _layout: () => (
          <Tabs>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="t2" />
          </Tabs>
        ),
        index: () => <Watcher id="t1" />,
        t2: () => <Watcher id="t2" />,
      },
      { initialUrl: '/' },
    );
    await press('to-t2-t1');
    await act(async () => {
      probe.set('second');
    });

    expect(log).not.toContain('unmount:t1');
    expect(log).toContain('render:t1:second');
  });
});
