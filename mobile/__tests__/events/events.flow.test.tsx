// Events ⑤–⑨ (port of prototype events.items.test, plus the flow of spec §10): recording needs consent, the three
// outcome steps, Create tasks → confirmed results; a Member only reads Step 3; Cancel needs a reason; Move to Archive
// goes back to the list with Undo.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { deleteForever } from '../../src/data/archive';
import { listEntries } from '../../src/data/archive.store';
import { findEvent } from '../../src/data/events.store';
import { getTasksState } from '../../src/data/tasks.store';
import { openEvents, resetEventStores } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetEventStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
const CONSENT = 'Attendees have been told this meeting is recorded';

describe('recording and meeting outcomes', () => {
  it('opens Recording mode from the minutes; Start recording waits for the consent', async () => {
    await openEvents('/events/daily');
    await press('Voice · from 9:00 AM');
    expect(screen).toHavePathname('/events/daily/record');
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

describe('cancel and archive', () => {
  it('Cancel event needs a reason, then the detail shows it and keeps only Move to Archive', async () => {
    await openEvents('/events/review');
    await fireEvent.press(screen.getByTestId('event-actions'));
    await fireEvent.press(await screen.findByText('Cancel event'));
    expect(screen.getByTestId('event-cancel')).toBeOnTheScreen();
    const confirm = () =>
      within(screen.getByTestId('event-cancel')).getByRole('button', { name: 'Cancel event' });
    expect(confirm()).toBeDisabled();
    await fireEvent.changeText(
      screen.getByPlaceholderText("Why isn't it happening?"),
      'Client moved it',
    );
    await fireEvent.press(confirm());
    expect(screen.getByText('Event canceled')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/review'));
    expect(screen.getByText('Canceled by Nico')).toBeOnTheScreen();
    expect(screen.getByText('Client moved it')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('event-actions'));
    expect(await screen.findByText('Move to Archive')).toBeOnTheScreen();
    expect(screen.queryByText('Cancel event')).not.toBeOnTheScreen();
  });

  it('Move to Archive returns to the list with Undo, which brings the event back', async () => {
    await openEvents('/events/sinar');
    await fireEvent.press(screen.getByTestId('event-actions'));
    await fireEvent.press(await screen.findByText('Move to Archive'));
    const sheet = within(screen.getByTestId('event-archive'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Archive' }));
    await waitFor(() => expect(screen).toHavePathname('/events'));
    expect(screen.queryByTestId('event-card-sinar')).not.toBeOnTheScreen();
    expect(screen.getByText('Event moved to Archive')).toBeOnTheScreen();
    await press('Undo');
    expect(screen.getByTestId('event-card-sinar')).toBeOnTheScreen();
    expect(screen.getByText('Event restored')).toBeOnTheScreen();
  });

  it('the archive sheet’s way to Cancel is its own link, named apart from the sheet’s Cancel', async () => {
    await openEvents('/events/sinar');
    await fireEvent.press(screen.getByTestId('event-actions'));
    await fireEvent.press(await screen.findByText('Move to Archive'));
    const sheet = within(screen.getByTestId('event-archive'));
    const link = sheet.getByRole('link', { name: 'Cancel this event instead' });
    expect(link.props.accessibilityHint).toBe(
      'Meeting not happening? Use Cancel so attendees know why.',
    );
    expect(sheet.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
    await fireEvent.press(link);
    await waitFor(() => expect(screen).toHavePathname('/events/sinar/cancel'));
  });

  it('Undo after Archive deleted the event forever says so and restores nothing', async () => {
    await openEvents('/events/sinar');
    await fireEvent.press(screen.getByTestId('event-actions'));
    await fireEvent.press(await screen.findByText('Move to Archive'));
    const sheet = within(screen.getByTestId('event-archive'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Archive' }));
    await waitFor(() => expect(screen).toHavePathname('/events'));
    const entry = listEntries().find((x) => x.ref === 'sinar');
    if (!entry) throw new Error('archiving sinar wrote no Archive entry');
    await act(async () => deleteForever(entry.key));
    await press('Undo');
    expect(
      screen.getByText("This event was deleted forever and can't be restored."),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('snack')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('event-card-sinar')).not.toBeOnTheScreen();
    expect(findEvent('sinar')).toBeUndefined();
  });
});
