// Tasks list and Filter & sort screens (port of prototype tasks.list.test / tasks.filter.test): the My tasks groups,
// My / All, opening a card, NoMatch + Reset, and the filter sheet's draft, Reset, Apply and dot.
import { fireEvent, screen, within } from '@testing-library/react-native';

import { openTasks, resetTaskStores } from '../helpers/tasks-router';

resetTaskStores();

const card = (no: number) => screen.queryByTestId(`task-card-${no}`);
const shown = (nos: number[]) => nos.filter((no) => card(no));
const filterButton = () => screen.getByRole('button', { name: 'Filter and sort' });
const filterOn = () => filterButton().props.accessibilityValue?.text === 'Filters on';
const sheet = () => within(screen.getByTestId('filter-sheet'));
const tab = (name: string) => within(screen.getByTestId('tasks-scope')).getByRole('tab', { name });

describe('tasks list', () => {
  it('opens My tasks with the review queue and the urgency groups', async () => {
    await openTasks('/tasks');
    expect(screen.getByTestId('screen-tasks')).toBeOnTheScreen();
    expect(tab('My tasks')).toBeSelected();
    for (const head of ['Waiting for my review', 'Overdue', 'Today', 'Tomorrow']) {
      expect(screen.getByRole('header', { name: new RegExp(`^${head}`) })).toBeOnTheScreen();
    }
    expect(shown([17, 12, 14, 9])).toEqual([17, 12, 14, 9]);
    expect(filterOn()).toBe(false);
  });

  it('switches to All tasks in place', async () => {
    await openTasks('/tasks');
    await fireEvent.press(tab('All tasks'));
    expect(screen).toHavePathname('/tasks');
    expect(screen).toHaveSearchParams({ scope: 'all' });
    expect(tab('All tasks')).toBeSelected();
  });

  it('opens the tapped card’s detail', async () => {
    await openTasks('/tasks');
    const twelve = card(12);
    if (!twelve) throw new Error('card #12 is not listed');
    await fireEvent.press(twelve);
    expect(screen).toHavePathname('/tasks/12');
    expect(await screen.findByTestId('screen-task')).toBeOnTheScreen();
  });

  it('shows NoMatch for a search with no hit, and Reset brings the list back', async () => {
    await openTasks('/tasks');
    await fireEvent.changeText(screen.getByLabelText('Search title, #number, or tag…'), 'zzz');
    expect(screen.getByTestId('no-match')).toBeOnTheScreen();
    await fireEvent.press(within(screen.getByTestId('no-match')).getByRole('button'));
    expect(shown([17, 12])).toEqual([17, 12]);
  });
});

describe('tasks filter', () => {
  it('scopes All tasks to Atlas inside the sheet, so its dot is on from the start', async () => {
    await openTasks('/tasks?scope=all');
    expect(filterOn()).toBe(true);
    await fireEvent.press(filterButton());
    expect(await screen.findByTestId('filter-project')).toHaveAccessibilityValue({
      text: 'Atlas Project',
    });
  });

  it('Apply narrows My tasks and lights the dot; Reset in the sheet goes back to the default', async () => {
    await openTasks('/tasks');
    await fireEvent.press(filterButton());
    expect(await screen.findByTestId('filter-sheet')).toBeOnTheScreen();
    await fireEvent.press(sheet().getByRole('button', { name: 'High' }));
    await fireEvent.press(sheet().getByText('Apply'));
    expect(screen).toHavePathname('/tasks');
    expect(filterOn()).toBe(true);
    expect(shown([17, 12, 14, 9])).not.toEqual([17, 12, 14, 9]);

    await fireEvent.press(filterButton());
    await fireEvent.press(await screen.findByText('Reset'));
    await fireEvent.press(sheet().getByText('Apply'));
    expect(filterOn()).toBe(false);
  });

  it('a draft left without Apply changes nothing', async () => {
    await openTasks('/tasks');
    await fireEvent.press(filterButton());
    await screen.findByTestId('filter-sheet');
    await fireEvent.press(sheet().getByRole('button', { name: 'High' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(filterOn()).toBe(false);
  });
});
