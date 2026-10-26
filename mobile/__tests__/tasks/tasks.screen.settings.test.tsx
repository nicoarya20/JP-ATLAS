// Project settings of the Tasks module (port of prototype tasks.settings), the screen W4 mounts at
// projects/[id]/settings: a Member sees "Not available"; a Manager sees the review switch, the types and the tags, and
// deleting a tag asks first.
import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import type { Role } from '../../src/data/sample';
import { TasksSettings } from '../../src/screens/tasks';
import { drainToastTimers } from '../helpers/toast-timers';

drainToastTimers();

const open = (role: Role) =>
  renderRouter(
    { index: () => <TasksSettings projectId="atlas" role={role} /> },
    { initialUrl: '/', wrapper: GluestackUIProvider },
  );

describe('tasks project settings', () => {
  it('is not available for a Member', async () => {
    await open('member');
    expect(screen.getByTestId('tasks-settings-locked')).toBeOnTheScreen();
    expect(screen.getByText('Not available for Member')).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  it('shows the review switch, three task types and the tags with their counts to a Manager', async () => {
    await open('pm');
    expect(screen.getByRole('header', { name: 'Atlas Project' })).toBeOnTheScreen();
    expect(screen.getByText('Off')).toBeOnTheScreen();
    await fireEvent(
      screen.getByRole('switch', { name: 'New tasks need review' }),
      'valueChange',
      true,
    );
    expect(screen.getByText('On')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^type-/)).toHaveLength(3);
    expect(
      screen.getByText('3 of max. 6 active types · name and category only, does not affect review'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('tag-api')).toBeOnTheScreen();
  });

  it('a type’s Archive link says it is archived (Phase 1 toast)', async () => {
    await open('admin');
    await fireEvent.press(screen.getByRole('button', { name: 'Archive Bug' }));
    expect(await screen.findByText('Type archived')).toBeOnTheScreen();
  });

  it('Delete tag asks first (T2): Cancel keeps it, Delete tag says it is deleted', async () => {
    await open('pm');
    expect(screen.getByRole('button', { name: 'Add type' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete api' }));
    const dialog = within(await screen.findByTestId('delete-tag-dialog'));
    expect(dialog.getByText('Delete tag api?')).toBeOnTheScreen();
    expect(
      dialog.getByText('Tasks keep their other tags. This cannot be undone.'),
    ).toBeOnTheScreen();
    await fireEvent.press(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Tag deleted')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Delete api' }));
    await fireEvent.press(await screen.findByTestId('confirm-action'));
    expect(await screen.findByText('Tag deleted')).toBeOnTheScreen();
  });
});
