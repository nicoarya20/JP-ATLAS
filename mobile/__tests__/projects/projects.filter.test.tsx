// Projects ①b Filter & sort in the route tree against a stubbed `GET /api/app/projects`: what Apply asks the server
// for, the dot on the filter icon, and Reset back to the default list.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { resetProjectsQuery } from '../../src/data/projects.api';
import { forgetAllResources } from '../../src/data/resource';
import { serveAuth } from '../helpers/auth-server';
import { atlasItem, page, query } from '../helpers/projects-fixtures';
import { openProjects, resetProjectStores } from '../helpers/projects-router';

resetProjectStores();

let server: ReturnType<typeof serveAuth> | null = null;
const asked = () =>
  (server?.calls ?? []).filter((u) => u.includes('/api/app/projects?')).map(query);

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
  server = serveAuth({ '/api/app/projects?': { body: page([atlasItem()]) } });
});
afterEach(() => {
  server?.restore();
  server = null;
});

const sheet = () => within(screen.getByTestId('filter-sheet'));

describe('Filter & sort', () => {
  test('Apply sends the status, Needs attention and the sort; the filter icon shows its dot', async () => {
    await openProjects('/projects');
    await screen.findByTestId('project-card-p-atlas');
    await fireEvent.press(screen.getByTestId('projects-filter'));
    await waitFor(() => expect(screen).toHavePathname('/projects/filter'));
    await fireEvent.press(sheet().getByRole('button', { name: 'Active' }));
    await fireEvent(sheet().getByRole('switch', { name: 'Needs attention' }), 'valueChange', true);
    await fireEvent.press(sheet().getByLabelText('Name (A–Z)'));
    await fireEvent.press(sheet().getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(await screen.findByTestId('projects-filter-dot')).toBeOnTheScreen();
    expect(asked().at(-1)).toEqual({
      scope: 'all',
      sort: 'name',
      page: '1',
      limit: '25',
      status: 'active',
      perhatian: '1',
    });
  });

  test('Reset in the sheet puts the draft back to all projects, nearest deadline first', async () => {
    await openProjects('/projects');
    await screen.findByTestId('project-card-p-atlas');
    await fireEvent.press(screen.getByTestId('projects-filter'));
    await waitFor(() => expect(screen).toHavePathname('/projects/filter'));
    await fireEvent.press(sheet().getByRole('button', { name: 'Done' }));
    await fireEvent.press(sheet().getByRole('button', { name: 'Reset' }));
    await fireEvent.press(sheet().getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    // Apply asks again, with the default query rather than Done.
    await waitFor(() => expect(asked()).toHaveLength(2));
    expect(asked()[1]).toEqual({ scope: 'all', sort: 'due', page: '1', limit: '25' });
    expect(screen.queryByTestId('projects-filter-dot')).not.toBeOnTheScreen();
  });
});
