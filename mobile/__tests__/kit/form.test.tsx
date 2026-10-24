import { fireEvent, render, screen } from '@testing-library/react-native';
import { List, SquareKanban } from 'lucide-react-native';

import { Chips, MultiChips } from '../../src/components/form/chips';
import { Field } from '../../src/components/form/field';
import { RadioList } from '../../src/components/form/radio-list';
import { SectionLabel } from '../../src/components/form/section-label';
import { Seg } from '../../src/components/form/seg';
import { SwitchRow } from '../../src/components/form/switch-row';
import { Button, ButtonText } from '../../src/components/ui/button';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });
const selected = (name: string, role: 'button' | 'tab' = 'button') =>
  screen.getByRole(role, { name }).props.accessibilityState?.selected;

describe('Field', () => {
  test('is named by its label, shows the hint and error, and reports typing', async () => {
    const onChangeText = jest.fn();
    await show(
      <Field
        label="Title"
        required
        value=""
        onChangeText={onChangeText}
        placeholder="What needs doing?"
        error="Add a title."
        testID="title"
      />,
    );
    await fireEvent.changeText(screen.getByTestId('title'), 'Fix login');
    expect(onChangeText).toHaveBeenCalledWith('Fix login');
    expect(screen.getByLabelText('Title')).toBeOnTheScreen();
    expect(screen.getByText('Add a title.')).toBeOnTheScreen();
  });

  test('a button in the right slot stays reachable by screen readers', async () => {
    const onCopy = jest.fn();
    await show(
      <Field
        label="Link"
        value="https://"
        onChangeText={jest.fn()}
        right={
          <Button size="sm" onPress={onCopy}>
            <ButtonText>Copy</ButtonText>
          </Button>
        }
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  test('a multiline field is a text area', async () => {
    await show(<Field label="Note" value="Hi" onChangeText={jest.fn()} multiline testID="note" />);
    expect(screen.getByTestId('note').props.multiline).toBe(true);
  });
});

describe('Chips, MultiChips and Seg', () => {
  test('Chips mark one pick and report the tapped index', async () => {
    const onChange = jest.fn();
    await show(
      <Chips items={['All', 'To do', 'Done']} value={1} onChange={onChange} label="Status" />,
    );
    expect(selected('To do')).toBe(true);
    expect(selected('All')).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('MultiChips toggle one value and keep item order', async () => {
    const onChange = jest.fn();
    const items = [
      { value: 'high', label: 'High' },
      { value: 'normal', label: 'Normal' },
      { value: 'low', label: 'Low' },
    ] as const;
    await show(<MultiChips items={items} value={['low']} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'High' }));
    expect(onChange).toHaveBeenLastCalledWith(['high', 'low']);
    await fireEvent.press(screen.getByRole('button', { name: 'Low' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  test('Seg is a tab list with the picked tab selected', async () => {
    const onChange = jest.fn();
    await show(
      <Seg
        items={['List', 'Kanban']}
        icons={[List, SquareKanban]}
        value={0}
        onChange={onChange}
        testID="view"
      />,
    );
    expect(screen.getByTestId('view').props.accessibilityRole).toBe('tablist');
    expect(selected('List', 'tab')).toBe(true);
    await fireEvent.press(screen.getByRole('tab', { name: 'Kanban' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

describe('SwitchRow, RadioList and SectionLabel', () => {
  test('SwitchRow flips its value', async () => {
    const onChange = jest.fn();
    await show(
      <SwitchRow label="Email updates" sub="Once a day" value={false} onChange={onChange} />,
    );
    expect(screen.getByText('Once a day')).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText('Email updates'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('RadioList reports the picked item', async () => {
    const onChange = jest.fn();
    await show(
      <RadioList
        label="Sort by"
        items={['Due date', 'Priority']}
        value="Due date"
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('Sort by')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Priority'));
    expect(onChange).toHaveBeenCalledWith('Priority');
  });

  test('SectionLabel is a header', async () => {
    await show(<SectionLabel>Status</SectionLabel>);
    expect(screen.getByRole('header', { name: 'Status' })).toBeOnTheScreen();
  });
});
