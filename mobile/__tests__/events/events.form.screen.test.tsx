// Events ③a / ③b New event and Edit (port of prototype events.items.test): Save is off without a title, attendees are
// removable except the creator, New opens the saved event, Edit updates it and goes back to its detail.
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
});
