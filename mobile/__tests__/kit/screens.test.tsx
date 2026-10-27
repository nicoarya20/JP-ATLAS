// Reanimated declares toHaveAnimatedStyle (installed by setUpTests in jest.setup.js) in a file nothing imports.
/// <reference path="../../node_modules/react-native-reanimated/lib/typescript/jestUtils/index.native.d.ts" />
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { DetailHeader } from '../../src/components/screen/detail-header';
import { usePinnedProgress, useRegisterFind } from '../../src/components/screen/stacked-context';
import { StackedScreen } from '../../src/components/screen/stacked-screen';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { Text } from '../../src/components/ui/text';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

beforeEach(() => jest.mocked(router.back).mockClear());

describe('DetailHeader', () => {
  test('Back pops the route; the title is a header and the right slot shows', async () => {
    await show(<DetailHeader title="Task #21" sub="Atlas" right={<Text>⋯</Text>} />);
    expect(screen.getByRole('header', { name: 'Task #21' })).toBeOnTheScreen();
    expect(screen.getByText('Atlas')).toBeOnTheScreen();
    expect(screen.getByText('⋯')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('a modal screen offers Cancel instead; back={false} draws no chevron', async () => {
    const onBack = jest.fn();
    await show(<DetailHeader title="New task" modal onBack={onBack} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    await show(<DetailHeader title="Settings" back={false} />);
    expect(screen.queryByTestId('detail-back')).not.toBeOnTheScreen();
  });
});

describe('StackedScreen', () => {
  const stacked = (onFind?: () => void) =>
    show(
      <StackedScreen
        title="Tasks"
        find={<Text>Search block</Text>}
        onFind={onFind}
        pinned={<Text>Switches</Text>}
      >
        <Text>Card</Text>
      </StackedScreen>,
    );

  test('large title, search block, pinned row and content; the header icon starts hidden', async () => {
    await stacked();
    expect(screen.getByRole('header', { name: 'Tasks' })).toBeOnTheScreen();
    expect(screen.getByText('Search block')).toBeOnTheScreen();
    expect(screen.getByTestId('stacked-pinned')).toHaveTextContent('Switches');
    expect(screen.getByText('Card')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeOnTheScreen();
  });

  test('scrolled past half the search block, the block hides and the header icon takes over', async () => {
    const onFind = jest.fn();
    await stacked(onFind);
    await fireEvent(screen.getByTestId('stacked-find-block'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 60 } },
    });
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('stacked-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y: 40 },
          contentSize: { width: 375, height: 2000 },
          layoutMeasurement: { width: 375, height: 700 },
        },
      });
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Search' }));
    expect(onFind).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Search block')).not.toBeOnTheScreen();
  });

  test('without a search block there is no header icon', async () => {
    await show(
      <StackedScreen title="More">
        <Text>Rows</Text>
      </StackedScreen>,
    );
    expect(screen.queryByTestId('stacked-find')).not.toBeOnTheScreen();
  });

  test('without a pinned row a corner-only 24 pt edge sticks under the header and lets touches through', async () => {
    await show(
      <StackedScreen title="Projects">
        <Text>Cards</Text>
      </StackedScreen>,
    );
    const edge = screen.getByTestId('stacked-edge');
    expect(edge.props.pointerEvents).toBe('none');
    expect(edge).toHaveStyle({ height: 24 });
    expect(screen.queryByTestId('stacked-pinned')).not.toBeOnTheScreen();
  });
});

describe('StackedScreen · pinned row and reveal', () => {
  /** Pinned child that paints the compaction progress as its opacity. */
  function Chips() {
    const q = usePinnedProgress();
    const style = useAnimatedStyle(() => ({ opacity: q.get() }));
    return <Animated.View testID="probe" style={style} />;
  }

  /** Search block content that registers a fake field. */
  function FakeField({ focus }: { focus: () => void }) {
    const register = useRegisterFind();
    useEffect(() => {
      register?.({ focus });
      return () => register?.(null);
    }, [register, focus]);
    return <Text>Field</Text>;
  }

  const scrollTo = async (y: number) =>
    act(async () => {
      fireEvent.scroll(screen.getByTestId('stacked-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y },
          contentSize: { width: 375, height: 2000 },
          layoutMeasurement: { width: 375, height: 700 },
        },
      });
    });

  async function renderPinned(focus = jest.fn()) {
    await show(
      <StackedScreen
        title="Home"
        find={<FakeField focus={focus} />}
        pinned={<Chips />}
        pinnedShrink={12}
      >
        <Text>Card</Text>
      </StackedScreen>,
    );
    await fireEvent(screen.getByTestId('stacked-find-block'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 60 } },
    });
    return focus;
  }

  test('the pinned row compacts step by step past the search block (12 px content + 4 px padding), and back', async () => {
    await renderPinned();
    for (const [y, q] of [
      [30, 0],
      [60, 0],
      [64, 0.25],
      [68, 0.5],
      [76, 1],
      [200, 1],
      [72, 0.75],
      [0, 0],
    ]) {
      await scrollTo(y);
      expect(screen.getByTestId('probe')).toHaveAnimatedStyle({ opacity: q });
    }
  });

  test('outside a StackedScreen the progress stays 0', async () => {
    await show(<Chips />);
    expect(screen.getByTestId('probe')).toHaveAnimatedStyle({ opacity: 0 });
  });

  test('the header icon scrolls back and focuses the field once the block is open again', async () => {
    const focus = await renderPinned();
    await scrollTo(40);
    await fireEvent.press(await screen.findByRole('button', { name: 'Search' }));
    expect(focus).not.toHaveBeenCalled();
    await scrollTo(0);
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
