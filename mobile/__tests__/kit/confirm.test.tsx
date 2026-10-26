import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ConfirmDialog } from '../../src/components/confirm/confirm-dialog';
import { nameMatches } from '../../src/components/confirm/type-to-confirm';
import { Button, ButtonText } from '../../src/components/ui/button';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

type Props = Partial<React.ComponentProps<typeof ConfirmDialog>>;

/** A button that opens the dialog, like a screen would. */
function Harness(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setOpen(true)}>
        <ButtonText>Open</ButtonText>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out?"
        message="You'll be signed out of this account."
        confirmLabel="Sign out"
        onConfirm={jest.fn()}
        danger
        {...props}
      />
    </>
  );
}

async function openDialog(props: Props = {}) {
  await render(<Harness {...props} />, { wrapper: GluestackUIProvider });
  await fireEvent.press(screen.getByText('Open'));
}

const action = () => screen.getByTestId('confirm-action');

describe('ConfirmDialog · T2', () => {
  test('shows the title and impact; Cancel closes without running the action', async () => {
    const onConfirm = jest.fn();
    await openDialog({ onConfirm });
    expect(screen.getByRole('header', { name: 'Sign out?' })).toBeOnTheScreen();
    expect(screen.getByText("You'll be signed out of this account.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('Sign out?')).not.toBeOnTheScreen();
  });

  test('the action runs, then the dialog closes', async () => {
    const onConfirm = jest.fn();
    await openDialog({ onConfirm });
    await fireEvent.press(action());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sign out?')).not.toBeOnTheScreen();
  });

  test('while an async action runs the button is busy; a failure stays open with a message', async () => {
    let fail: (e: Error) => void = () => {};
    const onConfirm = () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      });
    await openDialog({ onConfirm, confirmLabel: 'Approve', danger: false });
    await fireEvent.press(action());
    expect(action().props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await act(async () => fail(new Error('Network down')));
    expect(screen.getByText('Could not finish. Try again.')).toBeOnTheScreen();
    expect(action().props.accessibilityState).toMatchObject({ busy: false, disabled: false });
  });

  test('errorText turns the failure into the shown message', async () => {
    const onConfirm = () => {
      throw new Error('offline');
    };
    await openDialog({
      onConfirm,
      errorText: (e) => `Could not sign out: ${(e as Error).message}`,
    });
    await fireEvent.press(action());
    expect(screen.getByText('Could not sign out: offline')).toBeOnTheScreen();
  });
});

describe('ConfirmDialog · T3', () => {
  test('the action stays disabled until the name is typed exactly', async () => {
    const onConfirm = jest.fn();
    await openDialog({
      onConfirm,
      typeToConfirm: 'Old client portal',
      confirmLabel: 'Delete forever',
    });
    const field = screen.getByLabelText('Type the item name to confirm');
    expect(action().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(field, 'old client portal');
    await fireEvent.press(action());
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.changeText(field, 'Old client portal');
    expect(action().props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(action());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('while the delete runs the typed name stays readable to screen readers, but locked', async () => {
    await openDialog({
      onConfirm: () => new Promise<void>(() => undefined),
      typeToConfirm: 'Old client portal',
      confirmLabel: 'Delete forever',
    });
    const label = 'Type the item name to confirm';
    await fireEvent.changeText(screen.getByLabelText(label), 'Old client portal');
    expect(screen.getByLabelText(label)).toHaveProp('readOnly', false);
    await fireEvent.press(action());
    expect(action().props.accessibilityState).toMatchObject({ busy: true });
    // read-only, not disabled: gluestack hides a disabled input from VoiceOver
    expect(screen.getByLabelText(label)).toHaveProp('readOnly', true);
    expect(screen.getByLabelText(label)).not.toHaveProp('accessibilityElementsHidden', true);
  });

  test('nameMatches ignores surrounding spaces only', () => {
    expect(nameMatches('  Atlas ', 'Atlas')).toBe(true);
    expect(nameMatches('atlas', 'Atlas')).toBe(false);
  });
});
