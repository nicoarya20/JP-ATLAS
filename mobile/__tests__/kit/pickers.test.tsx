import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { DateField } from '../../src/components/form/date-field';
import { SelectField } from '../../src/components/form/select-field';
import { ActionMenu } from '../../src/components/menu/action-menu';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

describe('SelectField', () => {
  const options = [
    { value: 'atlas', label: 'Atlas' },
    { value: 'senior', label: 'Senior App' },
  ] as const;

  test('shows the picked label and reports a new pick', async () => {
    const onChange = jest.fn();
    await show(
      <SelectField
        label="Project"
        options={options}
        value="atlas"
        onChange={onChange}
        testID="project"
      />,
    );
    expect(screen.getByTestId('project').props.accessibilityValue).toEqual({ text: 'Atlas' });
    expect(screen.getByLabelText('Project')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Atlas', { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('project'));
    await fireEvent.press(await screen.findByText('Senior App'));
    expect(onChange).toHaveBeenCalledWith('senior');
  });
});

describe('DateField', () => {
  test('shows "No date" until set, then opens the picker and reports the ISO date', async () => {
    const onChange = jest.fn();
    await show(
      <DateField
        label="Due date"
        value={null}
        onChange={onChange}
        initial="2026-10-09"
        testID="due"
      />,
    );
    expect(screen.getByText('No date')).toBeOnTheScreen();
    expect(screen.queryByTestId('due-picker')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Due date' }));
    const picker = screen.getByTestId('due-picker');
    await fireEvent(picker, 'onChange', {
      nativeEvent: { timestamp: Date.UTC(2026, 9, 14), utcOffset: 0 },
    });
    expect(onChange).toHaveBeenCalledWith('2026-10-14');
  });

  test('a set value reads as month and day', async () => {
    await show(
      <DateField label="Due date" value="2026-10-09" onChange={jest.fn()} initial="2026-10-09" />,
    );
    expect(screen.getByText('Oct 9')).toBeOnTheScreen();
  });
});

describe('ActionMenu', () => {
  test('opens from the ⋯ button, runs the picked action and closes', async () => {
    const edit = jest.fn();
    const archive = jest.fn();
    await show(
      <ActionMenu
        label="Task actions"
        testID="menu"
        items={[
          { label: 'Edit task', onPress: edit },
          { label: 'Move to Archive', onPress: archive, danger: true },
        ]}
      />,
    );
    expect(screen.queryByText('Edit task')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('menu'));
    await fireEvent.press(await screen.findByText('Move to Archive'));
    expect(archive).toHaveBeenCalledTimes(1);
    expect(edit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Edit task')).not.toBeOnTheScreen());
  });
});
