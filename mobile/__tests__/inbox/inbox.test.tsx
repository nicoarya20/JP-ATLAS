import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { actor, getInbox, link } from '../../src/data/inbox';
import { getAllRead, markAllRead, resetInbox } from '../../src/data/inbox.store';
import { InboxScreen } from '../../src/screens/inbox/inbox.screen';
import { RespondTab } from '../../src/screens/inbox/respond.tab';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

beforeEach(() => {
  resetInbox();
  setParams({});
  jest.clearAllMocks();
});

describe('inbox data', () => {
  test('links: a task number, an event, a project', () => {
    expect(link('task #12 Fix SSO login')).toBe('/tasks/12');
    expect(link('Atlas Project')).toBe('/projects/atlas');
    expect(actor('Rina commented on task #14')).toBe('Rina');
  });

  test('Admin: the approvals card leads to Users; the review card says why', () => {
    const [approvals, review] = getInbox('admin', false).respond;
    expect(approvals).toMatchObject({ key: 'approvals', href: '/more/users' });
    expect(review.why).toBe("You're the task reviewer because the project has only one Manager");
  });

  test('PM: the second card is the AI outcomes card', () => {
    expect(getInbox('pm', false).respond[1].lead).toEqual({ kind: 'ai' });
  });

  test('marking all read clears every unread row', () => {
    const unread = (all: boolean) =>
      getInbox('pm', all)
        .updates.flatMap((d) => d.rows)
        .filter((r) => r.unread).length;
    expect(unread(false)).toBeGreaterThan(0);
    markAllRead();
    expect(unread(getAllRead())).toBe(0);
  });
});

describe('InboxScreen', () => {
  const show = (role: 'pm' | 'admin' = 'pm') =>
    render(<InboxScreen role={role} />, { wrapper: GluestackUIProvider });

  test('Needs your response: cards with their actions; an action opens its item', async () => {
    await show();
    expect(screen.getByText('Needs your response (3)')).toBeOnTheScreen();
    expect(screen.getByTestId('inbox-card-review')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Review: Dodi asked you to review a task'));
    expect(router.push).toHaveBeenCalledWith('/tasks/17');
  });

  test('the tab lives in the URL', async () => {
    await show();
    await fireEvent.press(screen.getByText('Latest updates'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'updates' });
  });

  test('Latest updates: Mark all as read drops the dots, says so, and stays read', async () => {
    setParams({ tab: 'updates' });
    await show();
    expect(screen.getAllByLabelText('Unread').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByText('Mark all as read'));
    expect(screen.queryAllByLabelText('Unread')).toHaveLength(0);
    expect(screen.getByText('All marked as read')).toBeOnTheScreen();
    expect(getAllRead()).toBe(true);
  });

  test('an update row opens its item', async () => {
    setParams({ tab: 'updates' });
    await show();
    await fireEvent.press(
      screen.getByLabelText('View: Rina commented on task #14 Write the API spec'),
    );
    expect(router.push).toHaveBeenCalledWith('/tasks/14');
  });

  test('nothing to respond to: the empty state points to the updates', async () => {
    const onUpdates = jest.fn();
    await render(<RespondTab cards={[]} onUpdates={onUpdates} />, { wrapper: GluestackUIProvider });
    expect(screen.getByText('All caught up')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('View latest updates'));
    expect(onUpdates).toHaveBeenCalledTimes(1);
  });
});
