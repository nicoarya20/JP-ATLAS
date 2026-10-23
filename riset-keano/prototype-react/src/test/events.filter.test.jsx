// Events ①b Filter & sort: the same icon + full-height overlay as Tasks. Apply re-opens the list / calendar with the
// query, which narrows the events (upcoming / past, type, project), groups the list (schedule or type) and redraws the calendar dots.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { renderApp } from './render';

const icon = () => dom.getByRole('button', { name: 'Filter and sort' });
const openFilter = () => { fireEvent.click(icon()); return within(dom.getByRole('dialog')); };
/** One labelled field of the overlay (Show and Event type both have an "All" chip). */
const field = (sheet, name) => within(sheet.getByRole('heading', { name, level: 3 }).closest('.field'));
const apply = sheet => fireEvent.click(sheet.getByRole('button', { name: 'Apply' }));
const shown = e => !!dom.queryByText(e.title);
const PAST = ['kickoff', 'daily'];   // done, or before today
const isPast = e => PAST.includes(e.id);
const upcoming = () => D.events.filter(e => !isPast(e));
const heads = () => dom.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
/** Dot class of an October date in the month grid: '' one event, 'two' more, 'none' no event. */
const dot = n => document.querySelectorAll('.ev-date')[n - 1].querySelector('.ev-dot').className.replace('ev-dot', '').trim();

describe('events filter & sort', () => {
  it('puts the filter icon on the search field like Tasks, above the List / Calendar switch at the top of the sheet', () => {
    renderApp('events.list', 'pm');
    expect(dom.queryByRole('button', { name: /^Filter$/ })).not.toBeInTheDocument();
    expect(icon().closest('.search-filter').querySelector('input')).toHaveAttribute('placeholder', 'Search title or location…');
    expect(icon()).not.toHaveClass('is-on');
    expect(icon().closest('.stk-find')).toBeInTheDocument();
    const tools = document.querySelector('.stk-sheet').firstElementChild;
    expect(within(tools).getByRole('tab', { name: 'List' })).toBeInTheDocument();
    expect(within(tools).getByRole('tab', { name: 'Calendar' })).toBeInTheDocument();
    expect(dom.queryByRole('tab', { name: 'Upcoming' })).not.toBeInTheDocument();
    expect(dom.queryByRole('tab', { name: 'Past' })).not.toBeInTheDocument();
  });

  it('opens a full-height Filter & sort overlay with show, type, project and group by, closed by the X', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    expect(dom.getByRole('dialog')).toHaveClass('fs');
    expect(sheet.getByRole('heading', { name: 'Filter & sort' })).toHaveAttribute('data-sheet-drag');
    expect(sheet.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Show', 'Event type', 'Project', 'Group by']);
    expect(field(sheet, 'Show').getAllByRole('button').map(b => b.textContent)).toEqual(['Upcoming', 'Past']);
    expect(field(sheet, 'Show').getByRole('button', { name: 'Upcoming' })).toHaveAttribute('aria-pressed', 'true');
    for (const t of ['All', 'Meeting', 'Review', 'Important', 'Team event', 'Other']) expect(field(sheet, 'Event type').getByRole('button', { name: t })).toBeInTheDocument();
    expect(field(sheet, 'Event type').getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('combobox', { name: 'Project' })).toHaveDisplayValue('All projects');
    expect(sheet.getByRole('radio', { name: 'Schedule' })).toBeChecked();
    expect(sheet.getAllByRole('radio')).toHaveLength(2);
    fireEvent.click(sheet.getByRole('button', { name: 'Close' }));
    expect(dom.queryByRole('heading', { name: 'Filter & sort' })).not.toBeInTheDocument();
  });

  it('shows only the past events (done, or before today) and lights the dot', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Past' }));
    apply(sheet);
    expect(D.events.filter(isPast).every(shown)).toBe(true);
    expect(D.events.filter(e => !isPast(e)).some(shown)).toBe(false);
    expect(icon()).toHaveClass('is-on');
  });

  it('opens on the upcoming events without lighting the dot, and keeps the type filter on top of it', () => {
    renderApp('events.list', 'pm');
    expect(upcoming().every(shown)).toBe(true);
    expect(D.events.filter(isPast).some(shown)).toBe(false);
    expect(icon()).not.toHaveClass('is-on');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Meeting' }));
    apply(sheet);
    expect(D.events.filter(e => e.type === 'Meeting' && !isPast(e)).map(e => e.id)).toEqual(['rehearsal']);
    expect(D.events.filter(shown).map(e => e.id)).toEqual(['rehearsal']);
  });

  it('narrows the list to one event type and lights the dot, without a toast', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Review' }));
    apply(sheet);
    expect(dom.queryByRole('heading', { name: 'Filter & sort' })).not.toBeInTheDocument();
    expect(dom.queryByText('Filter applied')).not.toBeInTheDocument();
    expect(D.events.filter(e => e.type === 'Review').every(shown)).toBe(true);
    expect(D.events.filter(e => e.type !== 'Review').some(shown)).toBe(false);
    expect(icon()).toHaveClass('is-on');
  });

  it('groups the list by type in form order instead of by schedule', () => {
    renderApp('events.list', 'pm');
    expect(heads()).toContain('Today · Wed, Oct 7');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('radio', { name: 'Type' }));
    apply(sheet);
    expect(heads()).toEqual(['Meeting', 'Review', 'Important', 'Team event']);
    expect(upcoming().every(shown)).toBe(true);
    expect(icon()).not.toHaveClass('is-on');
  });

  it('offers Reset filters when no event belongs to the picked project', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    fireEvent.change(sheet.getByRole('combobox', { name: 'Project' }), { target: { value: 'sinar' } });
    apply(sheet);
    expect(dom.getByRole('heading', { name: 'No events match these filters.' })).toBeInTheDocument();
    fireEvent.click(dom.getByRole('button', { name: 'Reset filters' }));
    expect(upcoming().every(shown)).toBe(true);
    expect(icon()).not.toHaveClass('is-on');
  });

  it('keeps the events of their own project (every sample event is Atlas)', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    fireEvent.change(sheet.getByRole('combobox', { name: 'Project' }), { target: { value: 'atlas' } });
    apply(sheet);
    expect(upcoming().every(shown)).toBe(true);
    expect(icon()).toHaveClass('is-on');
  });

  it('Reset puts the draft back to upcoming, every type, every project, by schedule', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Past' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Meeting' }));
    fireEvent.change(sheet.getByRole('combobox', { name: 'Project' }), { target: { value: 'sinar' } });
    fireEvent.click(sheet.getByRole('radio', { name: 'Type' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Reset' }));
    expect(field(sheet, 'Show').getByRole('button', { name: 'Upcoming' })).toHaveAttribute('aria-pressed', 'true');
    expect(field(sheet, 'Event type').getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('combobox', { name: 'Project' })).toHaveValue('');
    expect(sheet.getByRole('radio', { name: 'Schedule' })).toBeChecked();
  });

  it('draws the calendar dots and today\'s agenda from past and upcoming events alike', () => {
    renderApp('events.calendar', 'pm');
    expect([1, 8, 9, 13, 15, 23].map(dot)).toEqual(['', '', '', '', '', '']);
    expect(dot(7)).toBe('two');
    expect([2, 3].map(dot)).toEqual(['none', 'none']);
    expect(dom.getByRole('heading', { name: 'Wed, Oct 7 · 2 events' })).toBeInTheDocument();
    expect(dom.getByText('Onboarding design review')).toBeInTheDocument();
    expect(dom.getByText('Atlas daily stand-up')).toBeInTheDocument();
  });

  it('keeps the query on the calendar: dots and agenda show only the filtered events', () => {
    renderApp('events.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Review' }));
    apply(sheet);
    fireEvent.click(dom.getByRole('tab', { name: 'Calendar' }));
    expect(icon()).toHaveClass('is-on');
    expect([7, 9, 23].map(dot)).toEqual(['', '', '']);
    expect([1, 8, 13, 15].map(dot)).toEqual(['none', 'none', 'none', 'none']);
    expect(dom.getByRole('heading', { name: 'Wed, Oct 7 · 1 event' })).toBeInTheDocument();
    expect(dom.queryByText('Atlas daily stand-up')).not.toBeInTheDocument();
    fireEvent.click(dom.getByRole('tab', { name: 'List' }));
    expect(D.events.filter(e => e.type !== 'Review').some(shown)).toBe(false);
  });

  it('leaves Show off the calendar\'s overlay, since the calendar shows past and upcoming dates', () => {
    renderApp('events.calendar', 'pm');
    const sheet = openFilter();
    expect(sheet.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Event type', 'Project', 'Group by']);
    expect(sheet.queryByRole('button', { name: 'Past' })).not.toBeInTheDocument();
  });

  it('leaves the View button off the upcoming cards; tapping the card still opens the event', () => {
    renderApp('events.list', 'pm');
    expect(dom.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
    fireEvent.click(dom.getByText('Onboarding design review').closest('[role="button"]'));
    expect(dom.queryByRole('button', { name: 'Filter and sort' })).not.toBeInTheDocument();
    expect(dom.getAllByText('Onboarding design review').length).toBeGreaterThan(0);
  });
});
