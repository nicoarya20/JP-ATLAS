// Tasks list and Filter & sort screens (port of prototype tasks.list.test / tasks.filter.test): the My tasks groups,
// My / All, opening a card, NoMatch + Reset, what a screen reader hears of the cards and heads, and the filter sheet's
// draft, Reset, Apply and dot.
import { fireEvent, screen, within } from '@testing-library/react-native';

import { openTasks, resetTaskStores, settleTasks } from '../helpers/tasks-router';

resetTaskStores();

const card = (no: number) => screen.queryByTestId(`task-card-${no}`);
const shown = (nos: number[]) => nos.filter((no) => card(no));
const filterButton = () => screen.getByRole('button', { name: 'Filter and sort' });
const filterOn = () => filterButton().props.accessibilityValue?.text === 'Filters on';
const sheet = () => within(screen.getByTestId('filter-sheet'));
const tab = (name: string) => within(screen.getByTestId('tasks-scope')).getByRole('tab', { name });
const SEARCH = 'Search title or exact #number…';

describe('tasks list', () => {
  it('opens My tasks with the urgency groups the server put the rows in', async () => {
    await openTasks('/tasks');
    expect(screen.getByTestId('screen-tasks')).toBeOnTheScreen();
    expect(tab('My tasks')).toBeSelected();
    // No "Waiting for my review": the whole review flow waits on S4, so the group is hidden
    // (A6, docs/phase2-gap-disembunyikan.md) rather than shown with nothing behind it.
    expect(screen.queryByRole('header', { name: /^Waiting for my review/ })).not.toBeOnTheScreen();
    for (const head of ['Overdue', 'Today', 'Tomorrow', 'This week']) {
      expect(screen.getByRole('header', { name: new RegExp(`^${head}`) })).toBeOnTheScreen();
    }
    expect(shown([12, 14, 9, 17])).toEqual([12, 14, 9, 17]);
    // #3 is done, and an "All active" list asks for the three open statuses by name.
    expect(card(3)).toBeNull();
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

  it('shows NoMatch for a search the server has no hit for, and Reset brings the list back', async () => {
    await openTasks('/tasks');
    await fireEvent.changeText(screen.getByLabelText(SEARCH), 'zzz');
    await settleTasks();
    expect(screen.getByTestId('no-match')).toBeOnTheScreen();
    await fireEvent.press(within(screen.getByTestId('no-match')).getByRole('button'));
    await settleTasks();
    expect(shown([12, 14])).toEqual([12, 14]);
  });
});

describe('tasks list accessibility', () => {
  it('names the switches, a group head with the server’s count and a late card with how late', async () => {
    await openTasks('/tasks');
    expect(screen.getByTestId('tasks-scope')).toHaveAccessibleName('Scope');
    expect(screen.getByTestId('tasks-view')).toHaveAccessibleName('View');
    // The count is the one `/tasks/counts` sent, not the number of rows this page happens to hold.
    expect(screen.getByRole('header', { name: 'Overdue, 1 task' })).toBeOnTheScreen();
    expect(card(12)).toHaveAccessibleName(
      '#12 Fix login layout, Atlas Project, High, To do, Due Oct 5, 2 days late, Nico Pratama',
    );
    expect(
      within(screen.getByTestId('task-card-12')).getByText(/ · \d+ days? late$/),
    ).toBeOnTheScreen();
  });

  it('names an All tasks card and its Select tick after the task', async () => {
    await openTasks('/tasks?scope=all');
    // No kind in the name: a list row does not carry one (A3), so the segment is left out rather
    // than spoken as an empty gap.
    expect(card(17)).toHaveAccessibleName(
      '#17 Review the onboarding copy, High, In review, In review, Due Oct 9, Nico Pratama',
    );
    expect(screen.getByRole('checkbox', { name: /^Select #17 / })).toBeOnTheScreen();
  });
});

describe('tasks filter', () => {
  it('does not offer a Project filter, and its dot is off until something is really sent', async () => {
    // The project list is still the sample one, whose ids are not the server's: sending one would
    // ask for a list that comes back empty for no reason the user can see. So the row is gone, and
    // the dot counts only what is sent (docs/phase2-gap-disembunyikan.md).
    await openTasks('/tasks?scope=all');
    expect(filterOn()).toBe(false);
    await fireEvent.press(filterButton());
    await screen.findByTestId('filter-sheet');
    expect(screen.queryByTestId('filter-project')).not.toBeOnTheScreen();
  });

  it('does not offer the title sort, which the server has no sort for', async () => {
    await openTasks('/tasks');
    await fireEvent.press(filterButton());
    await screen.findByTestId('filter-sheet');
    // "Priority" is both a filter head and a sort, so the sorts are read as radios.
    for (const sort of ['Due date', 'Priority', 'Recently updated']) {
      expect(sheet().getByRole('radio', { name: sort })).toBeOnTheScreen();
    }
    // A16: sorting in the client would sort the page that happens to be loaded.
    expect(sheet().queryByRole('radio', { name: 'Title (A–Z)' })).not.toBeOnTheScreen();
  });

  it('Apply narrows My tasks and lights the dot; Reset in the sheet goes back to the default', async () => {
    await openTasks('/tasks');
    await fireEvent.press(filterButton());
    expect(await screen.findByTestId('filter-sheet')).toBeOnTheScreen();
    await fireEvent.press(sheet().getByRole('button', { name: 'High' }));
    await fireEvent.press(sheet().getByText('Apply'));
    await settleTasks();
    expect(screen).toHavePathname('/tasks');
    expect(filterOn()).toBe(true);
    // Only the High rows came back, so the medium one is gone.
    expect(card(14)).toBeNull();

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
