import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useNotice } from '../../src/components/notice/use-notice';
import { Button, ButtonText } from '../../src/components/ui/button';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { drainToastTimers } from '../helpers/toast-timers';

drainToastTimers();

function SaveButton() {
  const notice = useNotice();
  return (
    <Button onPress={() => notice('Task saved')}>
      <ButtonText>Save</ButtonText>
    </Button>
  );
}

test('a notice shows its message, then hides itself after 3 seconds', async () => {
  await render(<SaveButton />, { wrapper: GluestackUIProvider });

  await fireEvent.press(screen.getByText('Save'));
  expect(await screen.findByText('Task saved')).toBeOnTheScreen();

  await act(async () => jest.advanceTimersByTime(2900));
  expect(screen.getByText('Task saved')).toBeOnTheScreen();

  await act(async () => jest.advanceTimersByTime(200)); // 3 s: hide starts
  await act(async () => jest.advanceTimersByTime(200)); // 150 ms exit animation
  expect(screen.queryByText('Task saved')).not.toBeOnTheScreen();
});
