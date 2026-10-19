// Events ② calendar: no Today button; Month / Week switch the grid; tapping a date shows that date's agenda;
// Week arrows step a week at a time within October.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen as dom } from '@testing-library/react';
import '../screens';
import { renderApp } from './render';

const dates = () => [...document.querySelectorAll('.ev-date')].map(b => Number(b.textContent));
const date = name => dom.getByRole('button', { name });
const agendaHead = () => dom.getAllByRole('heading', { level: 2 }).at(-1).textContent;
const tap = name => fireEvent.click(dom.getByRole(/week|month/.test(name) ? 'button' : 'tab', { name }));

describe('events calendar', () => {
  it('has no Today button and opens on Month with today picked', () => {
    renderApp('events.calendar', 'pm');
    expect(dom.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
    expect(dom.getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true');
    expect(dom.getByText('October 2026')).toBeInTheDocument();
    expect(dates()).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(date('Wed, Oct 7')).toHaveAttribute('aria-pressed', 'true');
    expect(agendaHead()).toBe('Wed, Oct 7 · 1 event');
  });

  it('shows the agenda of the tapped date, a recurring event on each of its dates', () => {
    renderApp('events.calendar', 'pm');
    fireEvent.click(date('Thu, Oct 8'));
    expect(date('Thu, Oct 8')).toHaveAttribute('aria-pressed', 'true');
    expect(date('Wed, Oct 7')).toHaveAttribute('aria-pressed', 'false');
    expect(agendaHead()).toBe('Thu, Oct 8 · 1 event');
    expect(dom.getByText('Progress presentation to PT Sinar')).toBeInTheDocument();
    expect(dom.queryByText('Onboarding design review')).not.toBeInTheDocument();
    fireEvent.click(date('Fri, Oct 23'));
    expect(dom.getByText('Atlas sprint review')).toBeInTheDocument();
  });

  it('says so when the tapped date has no events', () => {
    renderApp('events.calendar', 'pm');
    fireEvent.click(date('Fri, Oct 2'));
    expect(agendaHead()).toBe('Fri, Oct 2 · 0 events');
    expect(dom.getByText('No events on this day.')).toBeInTheDocument();
  });

  it('Week shows only the picked date\'s Mon–Sun row', () => {
    renderApp('events.calendar', 'pm');
    tap('Week');
    expect(dates()).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(dom.getByText('Oct 5 – 11')).toBeInTheDocument();
    expect(dom.queryByText('October 2026')).not.toBeInTheDocument();
    expect(date('Wed, Oct 7')).toHaveAttribute('aria-pressed', 'true');
    tap('Month');
    expect(dates()).toHaveLength(31);
  });

  it('Week arrows move the picked date a week, stopping at the edges of October', () => {
    renderApp('events.calendar', 'pm');
    tap('Week');
    tap('Next week');
    expect(dates()).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(agendaHead()).toBe('Wed, Oct 14 · 0 events');
    tap('Previous week');
    tap('Previous week');
    expect(dates()).toEqual([1, 2, 3, 4]);
    expect(document.querySelectorAll('.ev-date')[0]).toBe(date('Thu, Oct 1'));
    expect(dom.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    for (let i = 0; i < 4; i++) tap('Next week');
    expect(dates()).toEqual([26, 27, 28, 29, 30, 31]);
    expect(dom.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('opens the done kickoff\'s results from the agenda when Past shows it', () => {
    renderApp('events.calendar', 'pm');
    fireEvent.click(dom.getByRole('button', { name: 'Filter and sort' }));
    fireEvent.click(dom.getByRole('button', { name: 'Past' }));
    fireEvent.click(dom.getByRole('button', { name: 'Apply' }));
    fireEvent.click(date('Thu, Oct 1'));
    expect(agendaHead()).toBe('Thu, Oct 1 · 1 event');
    fireEvent.click(dom.getByText('Atlas kickoff').closest('[role="button"]'));
    expect(dom.queryByRole('button', { name: 'Thu, Oct 1' })).not.toBeInTheDocument();
  });
});
