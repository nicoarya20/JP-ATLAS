// Profile ② My calendar (profile.calendar): week strip, swipe between weeks and the day's hour grid.
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { D } from '../data/sample';
import {
  TODAY, addDays, clock, dayLabel, eventsFor, hourLabel, itemsOn, monthLabel, weekOf,
} from '../screens/profile/profile.calendar.dates';
import { renderApp } from './render';

const week = () => within(dom.getByRole('group', { name: 'Week' }));
const selected = () => week().getByRole('button', { pressed: true });
const grid = () => document.querySelector('.pf-cal-grid');

/** Drag across the week strip by dx px. */
function swipeWeek(dx) {
  const strip = dom.getByRole('group', { name: 'Week' });
  act(() => {
    fireEvent.pointerDown(strip, { clientX: 200, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(strip, { clientX: 200 + dx / 2, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(strip, { clientX: 200 + dx, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(strip, { clientX: 200 + dx, clientY: 50, pointerId: 1 });
  });
}

describe('My calendar dates', () => {
  it('agrees with the sample data about today', () => {
    expect(dayLabel(TODAY)).toBe(D.today.date);
  });

  it('builds Sunday-first weeks', () => {
    expect(weekOf(TODAY).map(d => d.getDate())).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(weekOf(new Date(2026, 10, 1)).map(d => d.getDate())).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weekOf(new Date(2026, 9, 1)).map(d => d.getDate())).toEqual([27, 28, 29, 30, 1, 2, 3]);
    expect(monthLabel(TODAY)).toBe('October 2026');
  });

  it('formats hours and clock times', () => {
    expect([0, 9, 12, 15].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '3 PM']);
    expect(clock(9 * 60 + 41)).toBe('9:41');
    expect(clock(14 * 60 + 5)).toBe('2:05');
  });

  it('places events on minutes and repeats the sprint review every 2 weeks', () => {
    const nico = eventsFor('Nico');
    expect(itemsOn(nico, TODAY).map(it => [it.e.id, it.start, it.end])).toEqual([['daily', 540, 555], ['review', 840, 900]]);
    const sprintDays = [9, 16, 23, 30].filter(d => itemsOn(nico, new Date(2026, 9, d)).some(it => it.e.id === 'sprint'));
    expect(sprintDays).toEqual([9, 23]);
    expect(itemsOn(nico, addDays(TODAY, -7))).toEqual([]);
    expect(eventsFor('Sri').some(it => it.e.id === 'sinar')).toBe(false);
  });
});

describe('My calendar screen', () => {
  it('opens from the profile overlay', async () => {
    renderApp('home.main', 'pm');
    await userEvent.click(dom.getByRole('tab', { name: 'More' }));
    await userEvent.click(dom.getByRole('button', { name: `${D.me().full}, open profile` }));
    await userEvent.click(within(dom.getByRole('dialog', { name: /Profile/ })).getByText('My calendar'));
    expect(window.location.hash).toBe('#profile.calendar');
    expect(dom.queryByRole('dialog', { name: /Profile/ })).not.toBeInTheDocument();
    expect(dom.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  });

  it('shows this week with today selected, today\'s events and the now line', () => {
    renderApp('profile.calendar', 'pm');
    expect(week().getAllByRole('button').map(b => b.textContent.slice(1))).toEqual(['4', '5', '6', '7', '8', '9', '10']);
    expect(selected()).toHaveAccessibleName(`${D.today.date}, today`);
    expect(dom.getByText(D.today.date)).toBeInTheDocument();
    expect(within(grid()).getByText('Atlas daily stand-up')).toBeInTheDocument();
    expect(within(grid()).getByText('Onboarding design review')).toBeInTheDocument();
    expect(within(grid()).getByText('9:41')).toBeInTheDocument();
  });

  it('shows only the events the signed-in person attends', async () => {
    renderApp('profile.calendar', 'pm');
    await userEvent.click(week().getByRole('button', { name: 'Thursday, Oct 8, 2026' }));
    expect(within(grid()).getByText('Progress presentation to PT Sinar')).toBeInTheDocument();
    expect(within(grid()).queryByText('9:41')).not.toBeInTheDocument();
    renderApp('profile.calendar', 'member');
    await userEvent.click(within(dom.getAllByRole('group', { name: 'Week' }).at(-1)).getByRole('button', { name: 'Thursday, Oct 8, 2026' }));
    expect(dom.getAllByText('No events', { exact: false }).length).toBeGreaterThan(0);
  });

  it('swipes to the next and previous week', () => {
    renderApp('profile.calendar', 'pm');
    swipeWeek(-80);
    expect(selected()).toHaveAccessibleName('Wednesday, Oct 14, 2026');
    swipeWeek(80);
    swipeWeek(80);
    expect(selected()).toHaveAccessibleName('Wednesday, Sep 30, 2026');
    swipeWeek(-12); // too short to page: springs back
    expect(selected()).toHaveAccessibleName('Wednesday, Sep 30, 2026');
    expect(document.querySelector('.pf-cal-track').style.getPropertyValue('--wk-drag')).toBe('0px');
  });

  it('drags the week strip with the finger and ignores a vertical move', () => {
    renderApp('profile.calendar', 'pm');
    const strip = dom.getByRole('group', { name: 'Week' });
    const track = document.querySelector('.pf-cal-track');
    expect(track.querySelectorAll('.pf-cal-days')).toHaveLength(3); // last, this and next week ready to slide in
    act(() => {
      fireEvent.pointerDown(strip, { clientX: 200, clientY: 50, pointerId: 1, button: 0 });
      fireEvent.pointerMove(strip, { clientX: 170, clientY: 50, pointerId: 1 });
    });
    expect(track.style.getPropertyValue('--wk-drag')).toBe('-30px');
    expect(track).toHaveClass('is-dragging');
    act(() => { fireEvent.pointerCancel(strip, { pointerId: 1 }); });
    expect(track.style.getPropertyValue('--wk-drag')).toBe('0px');
    act(() => {
      fireEvent.pointerDown(strip, { clientX: 200, clientY: 50, pointerId: 2, button: 0 });
      fireEvent.pointerMove(strip, { clientX: 190, clientY: 120, pointerId: 2 });
      fireEvent.pointerUp(strip, { clientX: 120, clientY: 120, pointerId: 2 });
    });
    expect(selected()).toHaveAccessibleName(`${D.today.date}, today`);
  });

  it('has no month or Today controls; the month title follows the swiped week', () => {
    renderApp('profile.calendar', 'pm');
    expect(dom.queryByRole('button', { name: /month/ })).not.toBeInTheDocument();
    expect(dom.queryByText('Today')).not.toBeInTheDocument();
    swipeWeek(80);
    expect(dom.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    for (let i = 0; i < 5; i += 1) swipeWeek(-80);
    expect(selected()).toHaveAccessibleName('Wednesday, Nov 4, 2026');
    expect(dom.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
  });

  it('shows the repeating sprint review two weeks on and opens an event', async () => {
    renderApp('profile.calendar', 'pm');
    swipeWeek(-80);
    swipeWeek(-80);
    await userEvent.click(week().getByRole('button', { name: 'Friday, Oct 23, 2026' }));
    expect(within(grid()).getByText('Atlas sprint review')).toBeInTheDocument();
    await userEvent.click(within(grid()).getByText('Atlas sprint review'));
    expect(window.location.hash).toBe('#events.detail-recurring');
  });
});
