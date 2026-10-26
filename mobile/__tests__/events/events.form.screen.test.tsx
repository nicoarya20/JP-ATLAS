// Events ③a / ③b New event and Edit, against the fake `/api/app/events`: Save is off without a
// title, guests are removable except the creator, New posts the event and opens it, Edit patches it
// and goes back to its detail. W3c: required fields say "required" once, Save says why it is off
// (title once touched, time range at once), Location is a radio.
//
// The form sends instants in the team zone and keeps the meeting link apart from the room (B3). An
// edit never carries the project or the guest list — the server refuses both — so guest changes go
// through the guest routes, which is asserted here.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { detailFor } from '../helpers/events-api-fixtures';
import { answerEvents, eventCalls, openEvents, resetEventStores } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetEventStores();
drainToastTimers();

const button = (name: string) => screen.getByRole('button', { name });
const press = (name: string) => fireEvent.press(button(name));
const wrote = (method: string) => eventCalls().filter((c) => c.method === method);
/** The Edit form opens before its event is read; wait for the fields to arrive. */
const filled = (title: string) =>
  waitFor(() => expect(screen.getByTestId('event-title').props.value).toBe(title));

describe('event form', () => {
  it('Edit fills the form with the event and patches it, project and guests left out', async () => {
    await openEvents('/events/review');
    await waitFor(() => expect(screen.queryByTestId('events-loading')).not.toBeOnTheScreen());
    await press('Edit');
    expect(screen).toHavePathname('/events/new');
    expect(screen.getByText('Edit event')).toBeOnTheScreen();
    await filled('Onboarding design review');
    expect(button('Hide details')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('event-title'), 'Onboarding review v2');
    await press('Save');
    expect(await screen.findByText('Event updated')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/review'));
    const patch = wrote('PATCH')[0];
    expect(patch?.path).toBe('/api/app/events/review');
    expect(patch?.body).toMatchObject({
      title: 'Onboarding review v2',
      // 14:00–15:00 in the team zone, as the server stores them (K2).
      startsAt: '2026-10-07T07:00:00.000Z',
      endsAt: '2026-10-07T08:00:00.000Z',
      kind: 'review',
      locationType: 'offline',
      locationText: 'Meeting Room 2',
    });
    expect(patch?.body).not.toHaveProperty('projectId');
    expect(patch?.body).not.toHaveProperty('participantIds');
  });

  it('Edit sends a guest change through the guest routes, not through the PATCH', async () => {
    await openEvents('/events/review?event=review');
    await openEvents('/events/new?event=review');
    await filled('Onboarding design review');
    await press('Remove Nico');
    await press('Save');
    await waitFor(() => expect(wrote('DELETE')).toHaveLength(1));
    expect(wrote('DELETE')[0]?.path).toBe('/api/app/events/review/participants/u-nico');
  });

  it('Edit cannot change the project: the server refuses it, so the field is not offered', async () => {
    await openEvents('/events/new?event=review');
    await filled('Onboarding design review');
    expect(screen.queryByLabelText('Project')).not.toBeOnTheScreen();
  });

  it('Edit shows the server’s reason and keeps Save off when update is denied', async () => {
    answerEvents((call) =>
      /^\/api\/app\/events\/review$/.test(call.path)
        ? {
            body: {
              ...(detailFor('review') as { body: object }).body,
              can: { update: 'PROJECT_IN_TRASH' },
            },
          }
        : null,
    );
    await openEvents('/events/new?event=review');
    await filled('Onboarding design review');
    expect(screen.getByText('Proyeknya ada di Sampah. Pulihkan proyeknya dulu.')).toBeOnTheScreen();
    expect(screen.getByTestId('event-save')).toBeDisabled();
  });

  it('says so when the event being edited is gone', async () => {
    await openEvents('/events/new?event=nope');
    expect(await screen.findByTestId('event-gone')).toBeOnTheScreen();
  });

  it('New event: Save stays off without a title; a removed guest is gone; Save opens the new event', async () => {
    await openEvents('/events/new');
    expect(screen.getByText('New event')).toBeOnTheScreen();
    expect(button('Save')).toBeDisabled();
    expect(button('Add more details')).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('What is the meeting about?'),
      'Design sync',
    );
    expect(button('Save')).toBeEnabled();

    // The picker asks the server; the creator's own pill cannot be removed.
    await press('Add person');
    await fireEvent.press(await screen.findByText('Sri'));
    await press('Remove Sri');
    expect(screen.queryByRole('button', { name: 'Remove Sri' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove Nico' })).not.toBeOnTheScreen();

    await press('Save');
    expect(await screen.findByText('Event saved')).toBeOnTheScreen();
    const post = wrote('POST')[0];
    expect(post?.path).toBe('/api/app/events');
    expect(post?.body).toMatchObject({
      title: 'Design sync',
      kind: 'meeting',
      // No project picked: a personal event, sent as null rather than left out (B4).
      projectId: null,
      participantIds: ['u-nico'],
    });
    await waitFor(() => expect(screen).toHavePathname('/events/review'));
  });

  it('Add more details opens the rest of the form; Cancel closes it without saving', async () => {
    await openEvents('/events/new');
    await press('Add more details');
    expect(screen.getByLabelText('Agenda · one item per line')).toBeOnTheScreen();
    // the header's down chevron is named Cancel too; this is the footer's button
    await fireEvent.press(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByTestId('event-form')).not.toBeOnTheScreen());
    expect(wrote('POST')).toHaveLength(0);
  });

  it('names required fields "<label>, required" and reads each label once', async () => {
    await openEvents('/events/new');
    expect(screen.getByLabelText('Title, required')).toBeOnTheScreen();
    expect(button('Date, required')).toBeOnTheScreen();
    expect(button('Start')).toBeOnTheScreen();
    // the visible labels (and the star) stay out of the reading order: the controls carry them
    expect(screen.queryByText('Date *')).not.toBeOnTheScreen();
    expect(screen.getByText('Date *', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('Title')).not.toBeOnTheScreen();
    expect(screen.queryByText('*')).not.toBeOnTheScreen();
    expect(screen.getAllByText('*', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('says why Save is off once the title was touched and left empty', async () => {
    await openEvents('/events/new');
    const title = screen.getByTestId('event-title');
    expect(screen.queryByText('Enter a title.')).not.toBeOnTheScreen();
    await fireEvent(title, 'blur');
    expect(screen.getByText('Enter a title.')).toBeOnTheScreen();
    await fireEvent.changeText(title, 'Design sync');
    expect(screen.queryByText('Enter a title.')).not.toBeOnTheScreen();
    await fireEvent.changeText(title, '  ');
    expect(screen.getByText('Enter a title.').props.accessibilityLiveRegion).toBe('polite');
    expect(button('Save')).toBeDisabled();
  });

  it('an end before the start shows a red, announced error and marks End invalid', async () => {
    await openEvents('/events/new');
    await fireEvent.changeText(screen.getByTestId('event-title'), 'Design sync');
    expect(screen.queryByTestId('event-time-error')).not.toBeOnTheScreen();
    await press('End');
    await fireEvent.press(await screen.findByText('9:00 AM'));
    const error = screen.getByTestId('event-time-error');
    expect(error).toHaveTextContent('The end time must be after the start time.');
    expect(error.props).toMatchObject({
      accessibilityRole: 'alert',
      accessibilityLiveRegion: 'polite',
    });
    expect(button('End').props.accessibilityHint).toBe(
      'The end time must be after the start time.',
    );
    expect(button('Save')).toBeDisabled();
  });

  it('Location is a radio group of In person and Online', async () => {
    await openEvents('/events/new');
    expect(screen.getByRole('radio', { name: 'In person' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Online' }));
    expect(screen.getByRole('radio', { name: 'Online' })).toBeChecked();
    expect(screen.getByLabelText('Meeting link')).toBeOnTheScreen();
  });
});
