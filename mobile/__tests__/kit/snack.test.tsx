import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { SnackHost } from '../../src/components/snack/snack-host';
import { hideSnack, resetSnack, SNACK_MS, showSnack } from '../../src/components/snack/use-snack';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

/** The snack's exit animation (150 ms), with room to spare. */
const EXIT_MS = 300;

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await act(async () => resetSnack());
  await act(async () => jest.advanceTimersByTime(SNACK_MS + EXIT_MS));
  jest.useRealTimers();
});

const host = () => render(<SnackHost />, { wrapper: GluestackUIProvider });

test('nothing is drawn without a snack', async () => {
  await host();
  expect(screen.queryByTestId('snack')).not.toBeOnTheScreen();
});

test('a snack shows its message, is announced, and hides itself after 10 seconds', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await host();
  await act(async () => showSnack({ message: 'Task moved to Archive' }));
  expect(screen.getByText('Task moved to Archive')).toBeOnTheScreen();
  expect(announce).toHaveBeenCalledWith('Task moved to Archive');

  await act(async () => jest.advanceTimersByTime(SNACK_MS - 100));
  expect(screen.getByTestId('snack')).toBeOnTheScreen();
  await act(async () => jest.advanceTimersByTime(100 + EXIT_MS));
  expect(screen.queryByTestId('snack')).not.toBeOnTheScreen();
});

test('the action hides the snack, then runs', async () => {
  const undo = jest.fn();
  await host();
  await act(async () =>
    showSnack({ message: 'Task moved to Archive', action: 'Undo', onAction: undo }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(undo).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(EXIT_MS));
  expect(screen.queryByTestId('snack')).not.toBeOnTheScreen();
});

test('one snack at a time: a new one replaces the old, and hiding the old one by id leaves the new', async () => {
  await host();
  let first = 0;
  await act(async () => {
    first = showSnack({ message: 'First' });
  });
  await act(async () => showSnack({ message: 'Second' }));
  expect(screen.queryByText('First')).not.toBeOnTheScreen();
  await act(async () => hideSnack(first));
  expect(screen.getByText('Second')).toBeOnTheScreen();
});
