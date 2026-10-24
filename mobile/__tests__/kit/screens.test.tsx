import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { DetailHeader } from '../../src/components/screen/detail-header';
import { StackedScreen } from '../../src/components/screen/stacked-screen';
import { SheetFrame } from '../../src/components/sheet/sheet-frame';
import { Button, ButtonText } from '../../src/components/ui/button';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { Text } from '../../src/components/ui/text';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

beforeEach(() => jest.mocked(router.back).mockClear());

describe('SheetFrame', () => {
  test('title, sub, body and actions; Close pops the route by default', async () => {
    await show(
      <SheetFrame
        title="Move task"
        sub="#21 Fix login"
        actions={
          <Button>
            <ButtonText>Move</ButtonText>
          </Button>
        }
      >
        <Text>Pick a column</Text>
      </SheetFrame>,
    );
    expect(screen.getByRole('header', { name: 'Move task' })).toBeOnTheScreen();
    expect(screen.getByText('#21 Fix login')).toBeOnTheScreen();
    expect(screen.getByText('Pick a column')).toBeOnTheScreen();
    expect(screen.getByText('Move')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('a given onClose replaces the pop', async () => {
    const onClose = jest.fn();
    await show(
      <SheetFrame title="Sort" onClose={onClose}>
        <Text>Body</Text>
      </SheetFrame>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });
});

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
});
