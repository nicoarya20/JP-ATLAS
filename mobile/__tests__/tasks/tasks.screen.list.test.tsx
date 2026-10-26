// Tasks list and Filter & sort screens (port of prototype tasks.list.test / tasks.filter.test): the My tasks groups,
// My / All, opening a card, NoMatch + Reset, what a screen reader hears of the cards and heads, and the filter sheet's
// draft, Reset, Apply and dot.
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import {
  archiveProject,
  editProject,
  findProject,
  resetProjects,
} from '../../src/data/projects.store';
import { sheetGone } from '../helpers/sheet-gone';
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

describe('tasks list accessibility', () => {
  it('names the switches, a group head with its count and a late card with how late', async () => {
    await openTasks('/tasks');
    expect(screen.getByTestId('tasks-scope')).toHaveAccessibleName('Scope');
    expect(screen.getByTestId('tasks-view')).toHaveAccessibleName('View');
    expect(screen.getByRole('header', { name: 'Overdue, 1 task' })).toBeOnTheScreen();
    expect(card(12)).toHaveAccessibleName(
      '#12 Fix SSO login, Atlas Project, High, In progress, 2 days overdue, Due Oct 5, 2 days late, ' +
        'Nico Pratama, Steps 2/3',
    );
    expect(
      within(screen.getByTestId('task-card-12')).getByText(/ · \d+ days? late$/),
    ).toBeOnTheScreen();
  });

  it('names an All tasks card and its Select tick after the task', async () => {
    await openTasks('/tasks?scope=all');
    expect(card(17)).toHaveAccessibleName(
      '#17 Fix the save button on the profile page, Bug, Medium, In review, Waiting for my review, Due Oct 8, ' +
        'Dodi Hartono, Steps 2/2',
    );
    expect(screen.getByRole('checkbox', { name: /^Select #17 / })).toBeOnTheScreen();
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
    await sheetGone();
    expect(screen).toHavePathname('/tasks');
    expect(filterOn()).toBe(true);
    expect(shown([17, 12, 14, 9])).not.toEqual([17, 12, 14, 9]);

    await fireEvent.press(filterButton());
    await fireEvent.press(await screen.findByText('Reset'));
    await fireEvent.press(sheet().getByText('Apply'));
    await sheetGone();
    expect(filterOn()).toBe(false);
  });

  it('offers each listed project by its current name, and none from Archive', async () => {
    const atlas = findProject('atlas');
    if (!atlas) throw new Error('test-only: no sample project atlas');
    // Before anything renders, so no act() is needed.
    editProject('atlas', { ...atlas, name: 'Atlas v2' }, 'Nico');
    archiveProject('migration', 'Ayu');
    try {
      await openTasks('/tasks?scope=all');
      await fireEvent.press(filterButton());
      const pick = await screen.findByTestId('filter-project');
      expect(pick).toHaveAccessibilityValue({ text: 'Atlas v2' });
      await fireEvent.press(pick);
      expect(await screen.findByText('Internal Tools')).toBeOnTheScreen();
      expect(screen.queryByText('Legacy Data Migration')).not.toBeOnTheScreen();
    } finally {
      await act(async () => resetProjects());
    }
  });

  it('All tasks on Atlas, once Atlas is in Archive, names All projects in the sheet (W4g)', async () => {
    // Before anything renders, so no act() is needed.
    archiveProject('atlas', 'Ayu');
    try {
      await openTasks('/tasks?scope=all');
      expect(filterOn()).toBe(false);
      await fireEvent.press(filterButton());
      expect(await screen.findByTestId('filter-project')).toHaveAccessibilityValue({
        text: 'All projects',
      });
    } finally {
      await act(async () => resetProjects());
    }
  });

  it('a draft left without Apply changes nothing', async () => {
    await openTasks('/tasks');
    await fireEvent.press(filterButton());
    await screen.findByTestId('filter-sheet');
    await fireEvent.press(sheet().getByRole('button', { name: 'High' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await sheetGone();
    expect(filterOn()).toBe(false);
  });
});
