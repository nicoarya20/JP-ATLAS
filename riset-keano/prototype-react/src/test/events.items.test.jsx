// Events screens follow the event in their params: cards open their own detail, Edit fills the form with it, Cancel
// marks it, recording needs consent, and Step 3 creates the outcome tasks before showing the confirmed results.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { D } from '../data/sample';
import { resetEvents } from '../screens/events/events.store';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

afterEach(() => { resetEvents(); resetTasks(); });

const btn = name => dom.getByRole('button', { name });
// the shown screen's bar, not the one of a screen drawn inert under a modal form
const title = () => document.querySelector('.scr-slot > .scr .react-cupertino-ui-navigation-bar .title-compact').textContent;
const openCard = text => fireEvent.click(dom.getByText(text).closest('[role="button"]'));

describe('events by item', () => {
  it('opens the tapped card\'s own detail', () => {
    renderApp('events.list', 'pm');
    openCard('Progress presentation to PT Sinar');
    expect(dom.getByText('Progress presentation to PT Sinar')).toBeInTheDocument();
    expect(dom.queryByText('Onboarding design review')).not.toBeInTheDocument();
    expect(dom.getByText('Online')).toBeInTheDocument();
  });

  it('Edit fills the form with the event; Save updates it and goes back to the detail', async () => {
    renderApp('events.detail-upcoming', 'pm');
    fireEvent.click(btn('Edit'));
    expect(title()).toBe('Edit event');
    const field = dom.getByDisplayValue('Onboarding design review');
    fireEvent.change(field, { target: { value: 'Onboarding review v2' } });
    fireEvent.click(btn('Save'));
    expect(dom.getByText('Event updated')).toBeInTheDocument();
    await waitFor(() => expect(title()).toBe('Event detail'));   // the modal form slides down first
    expect(dom.getByText('Onboarding review v2')).toBeInTheDocument();
    expect(D.event('review').editor).toBe('Nico');
  });

  it('New event: removes an attendee, then Save opens the new event in place of the form', () => {
    renderApp('events.list', 'pm');
    fireEvent.click(btn('New event'));
    fireEvent.change(dom.getByPlaceholderText('What is the meeting about?'), { target: { value: 'Design sync' } });
    fireEvent.change(dom.getByRole('combobox', { name: 'Add person' }), { target: { value: 'Rina' } });
    fireEvent.click(btn('Remove Rina'));
    expect(dom.queryByRole('button', { name: 'Remove Rina' })).not.toBeInTheDocument();
    fireEvent.click(btn('Save'));
    expect(dom.getByText('Design sync')).toBeInTheDocument();
    fireEvent.click(btn('Back'));
    expect(dom.queryByPlaceholderText('What is the meeting about?')).not.toBeInTheDocument();
    expect(dom.getByText('Design sync')).toBeInTheDocument();
  });

  it('Cancel event needs a reason, then the detail shows it and keeps only Move to Archive', async () => {
    renderApp('events.detail-upcoming', 'pm');
    await userEvent.click(btn('Event actions'));
    await userEvent.click(dom.getByRole('menuitem', { name: 'Cancel event' }));
    expect(btn('Cancel event')).toBeDisabled();
    fireEvent.change(dom.getByPlaceholderText('Why isn\'t it happening?'), { target: { value: 'Client moved it' } });
    fireEvent.click(btn('Cancel event'));
    expect(await dom.findByText('Canceled by Nico')).toBeInTheDocument();
    expect(dom.getByText('Client moved it')).toBeInTheDocument();
    expect(dom.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    await userEvent.click(btn('Event actions'));
    expect(dom.getAllByRole('menuitem').map(m => m.textContent)).toEqual(['Move to Archive']);
  });

  it('starts recording only after the attendees were told', () => {
    renderApp('events.record-ready', 'pm');
    expect(btn('Start recording')).toBeDisabled();
    fireEvent.click(dom.getByLabelText('Attendees have been told this meeting is recorded'));
    expect(btn('Start recording')).toBeEnabled();
  });

  it('Step 3 needs every due date, then creates the tasks and shows the confirmed results', () => {
    renderApp('events.step3', 'pm');
    expect(btn('Create 2 tasks')).toBeDisabled();
    fireEvent.change(dom.getByRole('combobox', { name: 'Due date of Prepare test data once SSO is fixed' }), { target: { value: 'Oct 12' } });
    fireEvent.click(btn('Create 2 tasks'));
    expect(dom.getByText('2 tasks created · outcomes confirmed')).toBeInTheDocument();
    expect(dom.getByText('Confirmed · 2 tasks (0 done)')).toBeInTheDocument();
    expect(D.tasks.filter(t => t.title === 'Prepare test data once SSO is fixed')).toMatchObject([{ who: 'Dodi', due: 'Oct 12' }]);
    expect(D.event('daily').status).toBe('Done');
  });

  it('a Member sees only the events they attend on the calendar', () => {
    renderApp('events.calendar', 'member');
    fireEvent.click(btn('Thu, Oct 8'));
    expect(dom.queryByText('Progress presentation to PT Sinar')).not.toBeInTheDocument();
  });
});
