// Projects ① list and ①b Filter & sort (port of prototype projects.list.test / projects.filter.test): cards in
// deadline order, the people row in the route param, Member sees only their projects, filter and search with Reset.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { openProjects, resetProjectStores } from '../helpers/projects-router';

resetProjectStores();

const cardIds = () =>
  screen.queryAllByTestId(/^project-card-/).map((c) => String(c.props.testID).slice(13));
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

describe('Projects list', () => {
  it('shows every project for a PM, nearest deadline first', async () => {
    await openProjects('/projects');
    expect(screen.getByTestId('screen-projects')).toBeOnTheScreen();
    expect(cardIds()).toEqual(['website', 'migration', 'sinar', 'atlas', 'attendance', 'tools']);
  });

  it('a Member sees only the projects they are in', async () => {
    await openProjects('/projects', 'member');
    expect(cardIds()).toEqual(['migration', 'atlas', 'tools']);
  });

  it('My projects and a teammate pick live in the route param; Clear drops it', async () => {
    await openProjects('/projects');
    const people = within(screen.getByTestId('project-people'));
    await fireEvent.press(people.getByRole('button', { name: 'Lea' }));
    expect(screen).toHaveSearchParams({ who: 'Lea' });
    expect(screen.getByText("Lea's projects · 2")).toBeOnTheScreen();
    expect(cardIds()).toEqual(['website', 'sinar']);
    await press('Clear');
    expect(cardIds()).toHaveLength(6);
    await fireEvent.press(people.getByRole('button', { name: 'My projects' }));
    expect(screen.getByText('My projects · 4')).toBeOnTheScreen();
    expect(cardIds()).not.toContain('migration');
  });

  it('opens a project from its card', async () => {
    await openProjects('/projects');
    await fireEvent.press(screen.getByTestId('project-card-atlas'));
    await waitFor(() => expect(screen).toHavePathname('/projects/atlas'));
  });

  it('search narrows the cards; no match offers Reset filters', async () => {
    await openProjects('/projects');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Search project name or description…'),
      'atl',
    );
    expect(cardIds()).toEqual(['atlas']);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Search project name or description…'),
      'zzz',
    );
    expect(screen.getByText('No projects match these filters.')).toBeOnTheScreen();
    await press('Reset filters');
    expect(cardIds()).toHaveLength(6);
  });
});

describe('Filter & sort', () => {
  it('Apply keeps the picked status and sort; the filter icon shows its dot', async () => {
    await openProjects('/projects');
    await fireEvent.press(screen.getByTestId('projects-filter'));
    await waitFor(() => expect(screen).toHavePathname('/projects/filter'));
    const sheet = within(screen.getByTestId('filter-sheet'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Active' }));
    await fireEvent.press(sheet.getByLabelText('Name (A–Z)'));
    await press('Apply');
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(cardIds()).toEqual(['atlas', 'migration', 'sinar']);
    expect(screen.getByTestId('projects-filter-dot')).toBeOnTheScreen();
  });

  it('health filter matches "! Needs attention"; Reset in the sheet goes back to all', async () => {
    await openProjects('/projects/filter');
    const sheet = within(screen.getByTestId('filter-sheet'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Needs attention' }));
    await press('Apply');
    await waitFor(() => expect(cardIds()).toEqual(['sinar', 'atlas']));
    await fireEvent.press(screen.getByTestId('projects-filter'));
    await press('Reset');
    await press('Apply');
    await waitFor(() => expect(cardIds()).toHaveLength(6));
  });
});
