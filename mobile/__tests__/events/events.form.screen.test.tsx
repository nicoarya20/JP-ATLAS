// Events ③a / ③b New event and Edit (port of prototype events.items.test): Save is off without a title, attendees are
// removable except the creator, New opens the saved event, Edit updates it and goes back to its detail. W3c: required
// fields say "required" once, Save says why it is off (title once touched, time range at once), Location is a radio.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { eventsStore, findEvent } from '../../src/data/events.store';
import { openEvents, resetEventStores } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetEventStores();
drainToastTimers();

const button = (name: string) => screen.getByRole('button', { name });
const press = (name: string) => fireEvent.press(button(name));

describe('event form', () => {
  it('Edit fills the form with the event; Save updates it and goes back to the detail', async () => {
    await openEvents('/events/review');
    await press('Edit');
    expect(screen).toHavePathname('/events/new');
    expect(screen.getByText('Edit event')).toBeOnTheScreen();
    expect(screen.getByTestId('event-title').props.value).toBe('Onboarding design review');
    expect(button('Hide details')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('event-title'), 'Onboarding review v2');
    await press('Save');
    expect(screen.getByText('Event updated')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/review'));
    expect(screen.getByText('Onboarding review v2')).toBeOnTheScreen();
    expect(findEvent('review')?.editor).toBe('Nico');
  });

  it('New event: Save stays off without a title; a removed attendee is gone; Save opens the new event', async () => {
    await openEvents('/events/new');
    expect(screen.getByText('New event')).toBeOnTheScreen();
    expect(button('Save')).toBeDisabled();
    expect(button('Add more details')).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('What is the meeting about?'),
      'Design sync',
    );
    expect(button('Save')).toBeEnabled();

    await press('Add person');
    await fireEvent.press(await screen.findByText('Rina'));
    await press('Remove Rina');
    expect(screen.queryByRole('button', { name: 'Remove Rina' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove Nico' })).not.toBeOnTheScreen();

    const before = eventsStore.get().list.length;
    await press('Save');
    expect(screen.getByText('Event saved')).toBeOnTheScreen();
    const added = eventsStore.get().list.find((e) => e.title === 'Design sync');
    expect(eventsStore.get().list).toHaveLength(before + 1);
    expect(added?.attendees).toEqual(['Nico']);
    await waitFor(() => expect(screen).toHavePathname(`/events/${added?.id}`));
    expect(screen.getByTestId('screen-event')).toBeOnTheScreen();
    expect(screen.getByText('Design sync')).toBeOnTheScreen();
  });

  it('Add more details opens the rest of the form; Cancel closes it without saving', async () => {
    await openEvents('/events/new');
    await press('Add more details');
    expect(screen.getByLabelText('Agenda · one item per line')).toBeOnTheScreen();
    const before = eventsStore.get().list.length;
    // the header's down chevron is named Cancel too; this is the footer's button
    await fireEvent.press(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByTestId('event-form')).not.toBeOnTheScreen());
    expect(eventsStore.get().list).toHaveLength(before);
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
