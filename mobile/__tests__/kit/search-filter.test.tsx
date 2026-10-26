import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterButton, SearchFilter } from '../../src/components/filter/filter-button';
import { FilterField } from '../../src/components/filter/filter-field';
import { FilterSheet } from '../../src/components/filter/filter-sheet';
import { FindFieldContext } from '../../src/components/screen/stacked-context';
import { SearchField } from '../../src/components/search/search-field';
import { Text } from '../../src/components/ui/text';
import { Providers } from '../helpers/providers';

jest.mock('expo-router', () => ({ router: { back: jest.fn() }, usePreventRemove: jest.fn() }));

const show = (ui: React.ReactElement) => render(ui, { wrapper: Providers });

describe('SearchField', () => {
  test('a clear button shows while there is text; leaving the field empties it', async () => {
    await show(<SearchField placeholder="Search tasks" testID="q" />);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Search tasks'), 'login');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('q').props.value).toBe('');

    await fireEvent.changeText(screen.getByTestId('q'), 'login');
    await fireEvent(screen.getByTestId('q'), 'blur');
    expect(screen.getByTestId('q').props.value).toBe('');
  });

  test('keep holds the text on blur; a controlled field reports changes', async () => {
    const onChangeText = jest.fn();
    await show(
      <SearchField
        placeholder="Search"
        value="atlas"
        onChangeText={onChangeText}
        keep
        testID="q"
      />,
    );
    await fireEvent(screen.getByTestId('q'), 'blur');
    expect(onChangeText).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});

test('inside a stacked search block the field registers itself for the header icon', async () => {
  const register = jest.fn();
  await show(
    <FindFieldContext.Provider value={register}>
      <SearchField placeholder="Search tasks" />
    </FindFieldContext.Provider>,
  );
  expect(register).toHaveBeenCalledWith(expect.objectContaining({ focus: expect.any(Function) }));
});

describe('FilterButton and SearchFilter', () => {
  test('the dot and "Filters on" show only while the query narrows the list', async () => {
    const onPress = jest.fn();
    await show(<FilterButton on onPress={onPress} testID="filter" />);
    const button = screen.getByRole('button', { name: 'Filter and sort' });
    expect(button.props.accessibilityValue).toEqual({ text: 'Filters on' });
    expect(screen.getByTestId('filter-dot')).toBeOnTheScreen();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('no dot when off; SearchFilter pairs the field with the button', async () => {
    await show(
      <SearchFilter placeholder="Search tasks" on={false} onPress={jest.fn()} testID="filter" />,
    );
    expect(screen.getByLabelText('Search tasks')).toBeOnTheScreen();
    expect(screen.queryByTestId('filter-dot')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Filter and sort' }).props.accessibilityValue?.text,
    ).toBeUndefined();
  });
});

describe('FilterSheet and FilterField', () => {
  test('Filter & sort with its fields, Reset and Apply', async () => {
    const onReset = jest.fn();
    const onApply = jest.fn();
    await show(
      <FilterSheet onReset={onReset} onApply={onApply} onClose={jest.fn()}>
        <FilterField label="Status">
          <Text>Chips</Text>
        </FilterField>
      </FilterSheet>,
    );
    expect(screen.getByRole('header', { name: 'Filter & sort' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Status' })).toBeOnTheScreen();
    expect(screen.getByText('Chips')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reset'));
    await fireEvent.press(screen.getByText('Apply'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
