// Events ⑤–⑨ (port of prototype events.items.test, plus the flow of spec §10): recording needs consent, the three
// outcome steps, Create tasks → confirmed results; a Member only reads Step 3. The flow is hidden from the event detail
// until the server has it (E-1), so each test opens its route directly; it still runs on the sample data.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { findEvent } from '../../src/data/events.store';
import { getTasksState } from '../../src/data/tasks.store';
import { eventsPage } from '../helpers/events-fixtures';
import { eventsServer, openEvents } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';

const server = eventsServer();
// A step that goes back lands on the Events list, which asks the server.
beforeEach(() => server.use({ '/api/app/events?': { body: eventsPage([]) } }));
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
const CONSENT = 'Attendees have been told this meeting is recorded';

describe('recording and meeting outcomes', () => {
  it('Recording mode: Start recording waits for the consent', async () => {
    await openEvents('/events/daily/record');
    expect(button('Start recording')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText(CONSENT));
    expect(button('Start recording')).toBeEnabled();
    await press('Start recording');
    expect(screen).toHavePathname('/events/daily/recording');
    expect(screen.getByText('00:14:52')).toBeOnTheScreen();
    await press('Stop recording');
    expect(screen).toHavePathname('/events/daily/outcomes/1');
  });

  it('Step 1 → Step 2 → Step 3 → Create tasks → the confirmed results', async () => {
    await openEvents('/events/daily/outcomes/1');
    expect(screen.getByText('Step 1 of 3')).toBeOnTheScreen();
    // the AI mark is part of the button's name
    // the AI note is one stop, read without its mark or "="
    expect(
      screen.getByLabelText('AI-assisted. You can check and edit the text in the next step.'),
    ).toBeOnTheScreen();
    await press(/^Turn into text/);
    expect(screen.getByText('Step 2 of 3')).toBeOnTheScreen();
    expect(screen.getByTestId('minutes-text').props.value).toContain('SSO login still errors');
    await press('Next');
    expect(screen).toHavePathname('/events/daily/outcomes/3');
    expect(button('Create 2 tasks')).toBeDisabled();
    expect(screen.getByText('Fill in the due date first')).toBeOnTheScreen();

    await press('Due date of Prepare test data once SSO is fixed');
    await fireEvent.press(await screen.findByText('Oct 12'));
    expect(button('Create 2 tasks')).toBeEnabled();
    await press('Create 2 tasks');

    expect(screen.getByText('2 tasks created · outcomes confirmed')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/daily/results'));
    expect(screen.getByText('Confirmed · 2 tasks (0 done)')).toBeOnTheScreen();
    expect(findEvent('daily')?.status).toBe('Done');
    const made = getTasksState().tasks.filter(
      (t) => t.title === 'Prepare test data once SSO is fixed',
    );
    expect(made).toMatchObject([{ who: 'Dodi', due: '2026-10-12' }]);
  });

  it('Step 2 Save and exit goes back with Draft saved', async () => {
    await openEvents('/events/daily/outcomes/2');
    await press('Save and exit');
    expect(screen.getByText('Draft saved')).toBeOnTheScreen();
  });

  it('Remove drops a draft; with none left Step 3 confirms without tasks', async () => {
    await openEvents('/events/daily/outcomes/3');
    expect(screen.getByText(/^AI found 2 tasks\./)).toBeOnTheScreen();
    // each draft's buttons name the task they act on
    expect(button('Edit Prepare test data once SSO is fixed')).toBeOnTheScreen();
    await press('Remove Prepare test data once SSO is fixed');
    expect(screen.getAllByTestId('draft-task')).toHaveLength(1);
    await press(/^Remove /);
    expect(screen.queryAllByTestId('draft-task')).toHaveLength(0);
    await press('Confirm without tasks');
    expect(screen.getByText('Outcomes confirmed')).toBeOnTheScreen();
  });

  it('Step 3’s short View link reaches 44 pt through its hitSlop, not a wider look', async () => {
    await openEvents('/events/daily/outcomes/3');
    expect(button('View').props.hitSlop).toEqual({ left: 8, right: 8 });
  });

  it('an Admin discards instead of removing', async () => {
    await openEvents('/events/daily/outcomes/3', 'admin');
    expect(screen.getAllByRole('button', { name: /^Discard / })).toHaveLength(2);
    expect(button('Discard Prepare test data once SSO is fixed')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeOnTheScreen();
  });

  it('a Member only reads Step 3 and waits for the creator', async () => {
    await openEvents('/events/daily/outcomes/3', 'member');
    expect(screen.getByText('Waiting for Nico to review')).toBeOnTheScreen();
    expect(screen.getByText('You can only read these meeting outcomes.')).toBeOnTheScreen();
    expect(screen.getAllByTestId('draft-task')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Create/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeOnTheScreen();
  });

  it('the kickoff’s results list its tasks; a task opens in Tasks', async () => {
    await openEvents('/events/kickoff/results');
    expect(screen.getByTestId('screen-results')).toBeOnTheScreen();
    expect(screen.getByText('Meeting results')).toBeOnTheScreen();
    expect(screen.getByText('Open questions (1)')).toBeOnTheScreen();
    const [first] = screen.getAllByTestId(/^made-task-/);
    if (!first) throw new Error('the kickoff results list no task');
    await fireEvent.press(first);
    expect(screen.getByTestId(/^screen-task/)).toBeOnTheScreen();
  });
});
