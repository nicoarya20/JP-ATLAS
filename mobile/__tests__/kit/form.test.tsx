import { fireEvent, render, screen } from '@testing-library/react-native';
import { List, SquareKanban } from 'lucide-react-native';

import { Chips, MultiChips } from '../../src/components/form/chips';
import { Field } from '../../src/components/form/field';
import { FormError } from '../../src/components/form/form-error';
import { RadioList } from '../../src/components/form/radio-list';
import { SectionLabel } from '../../src/components/form/section-label';
import { Seg } from '../../src/components/form/seg';
import { SelectField } from '../../src/components/form/select-field';
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
    // "required" is said in the name; the visible label and its one star stay out of the reading order
    expect(screen.getByLabelText('Title, required')).toBeOnTheScreen();
    expect(screen.queryByText('Title')).not.toBeOnTheScreen();
    expect(screen.getAllByText('*', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('Add a title.').props.accessibilityLiveRegion).toBe('polite');
  });

  test('an optional field is named by its label alone and reports leaving it', async () => {
    const onBlur = jest.fn();
    await show(<Field label="Nickname" value="" onChangeText={jest.fn()} onBlur={onBlur} />);
    await fireEvent(screen.getByLabelText('Nickname'), 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('*', { includeHiddenElements: true })).not.toBeOnTheScreen();
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

  test('Seg labels stay on one line unless lines lets a long one wrap to two', async () => {
    const items = ['Needs your response (3)', 'Updates'];
    await show(<Seg items={items} value={0} onChange={jest.fn()} />);
    expect(
      screen.getByText('Needs your response (3)', { includeHiddenElements: true }).props
        .numberOfLines,
    ).toBe(1);
    await show(<Seg lines={2} items={items} value={0} onChange={jest.fn()} />);
    expect(
      screen.getByText('Needs your response (3)', { includeHiddenElements: true }).props
        .numberOfLines,
    ).toBe(2);
    expect(screen.getByText('Updates', { includeHiddenElements: true }).props.numberOfLines).toBe(
      2,
    );
  });
});

describe('Seg names', () => {
  test('names replace the spoken labels one by one; the visible text stays', async () => {
    await show(
      <Seg
        items={['Just write ✦', 'Fill form']}
        names={['Just write', 'Fill form']}
        value={0}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Just write' })).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'Just write ✦' })).not.toBeOnTheScreen();
    expect(screen.getByText('Just write ✦', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  test('without names, or with a names list of another length, the visible text is the name', async () => {
    await show(<Seg items={['List', 'Board']} value={0} onChange={jest.fn()} />);
    expect(screen.getByRole('tab', { name: 'List' })).toBeOnTheScreen();
    await show(
      <Seg items={['List', 'Board']} names={['My list']} value={0} onChange={jest.fn()} />,
    );
    expect(screen.getByRole('tab', { name: 'List' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Board' })).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'My list' })).not.toBeOnTheScreen();
  });
});

describe('Seg as radios, SelectField and FormError', () => {
  test('Seg kind radio is a named radio group with the picked radio checked', async () => {
    const onChange = jest.fn();
    await show(
      <Seg
        kind="radio"
        label="Location"
        items={['In person', 'Online']}
        value={0}
        onChange={onChange}
        testID="mode"
      />,
    );
    const group = screen.getByTestId('mode').props;
    expect([group.accessibilityRole, group.accessibilityLabel]).toEqual(['radiogroup', 'Location']);
    expect(screen.getByRole('radio', { name: 'In person' })).toBeChecked();
    expect(screen.queryByRole('tab')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Online' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('SelectField says "required" and reads its error as the hint', async () => {
    await show(
      <SelectField
        label="End"
        required
        options={[{ value: 'a', label: '9:00 AM' }]}
        value="a"
        onChange={jest.fn()}
        error="The end time must be after the start time."
      />,
    );
    const end = screen.getByRole('button', { name: 'End, required' });
    expect(end.props.accessibilityHint).toBe('The end time must be after the start time.');
    expect(end.props.accessibilityValue).toEqual({ text: '9:00 AM' });
  });

  test('FormError is a polite live alert', async () => {
    await show(<FormError testID="err">Pick a later end.</FormError>);
    expect(screen.getByTestId('err').props).toMatchObject({
      accessibilityRole: 'alert',
      accessibilityLiveRegion: 'polite',
    });
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
