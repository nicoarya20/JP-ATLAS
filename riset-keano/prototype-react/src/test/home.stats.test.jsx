// Home stat chips for Member and Manager come from D.tasks and D.events: open + overdue, in progress + most urgent due, done this week, upcoming this month.
import { afterEach, describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { setRole } from '../core/session';
import { myTaskStats, upcomingThisMonth } from '../screens/home/home.stats';
import { renderApp } from './render';

// test-only: extra tasks for the signed-in person, removed after each test.
const extra = [];
const add = (status, due, when = '') => {
  const t = { no: 900 + extra.length, title: `Extra ${extra.length}`, project: 'Atlas Project', status, who: D.me().name, due, when };
  extra.push(t); D.tasks.push(t);
};
afterEach(() => { extra.splice(0).forEach(t => D.tasks.splice(D.tasks.indexOf(t), 1)); });

describe('home task stats', () => {
  it('counts the Manager sample: one overdue task in progress, nothing done this week', () => {
    setRole('pm');
    const S = myTaskStats(), mine = D.tasks.filter(t => t.who === D.me().name);
    expect(S.assigned).toEqual({ count: mine.filter(t => t.status !== 'Done').length, sub: '1 overdue', alert: true });
    expect(S.inProgress).toEqual({ count: 1, sub: '1 overdue', alert: true });
    expect(S.completed).toEqual({ count: 0, sub: 'this week', alert: false });
  });

  it('says on track and none started when nothing is late or active', () => {
    setRole('member');
    const S = myTaskStats();
    expect(S.assigned).toMatchObject({ sub: 'on track', alert: false });
    expect(S.inProgress).toMatchObject({ count: 0, sub: 'none started' });
  });

  it('names tasks due today before the next due date', () => {
    setRole('member');
    add('In progress', 'Oct 12');
    expect(myTaskStats().inProgress).toMatchObject({ count: 1, sub: 'next due Oct 12', alert: false });
    add('In progress', D.today.short.slice(5));
    expect(myTaskStats().inProgress).toMatchObject({ count: 2, sub: '1 due today' });
  });

  it('counts only tasks finished since Monday as completed', () => {
    setRole('member');
    add('Done', 'Oct 6', 'Done Oct 6');
    add('Done', 'Oct 1', 'Done Oct 1');
    expect(myTaskStats().completed.count).toBe(1);
  });

  it('counts upcoming items from today to the end of the month: open tasks plus events not yet held', () => {
    setRole('pm');
    // Nico: #14 due today and #9 tomorrow (#12 is overdue, #8 done); 5 events ahead (today's 9:00 stand-up is already done).
    expect(upcomingThisMonth()).toEqual({ count: 7, sub: '7 items' });
    setRole('member');
    // Dodi: #17 and #16; review, sprint review and the anniversary party.
    expect(upcomingThisMonth()).toEqual({ count: 5, sub: '5 items' });
  });

  it('leaves out past, done and next-month tasks from Upcoming', () => {
    setRole('member');
    const base = upcomingThisMonth().count;
    add('To do', 'Oct 6');
    add('Done', 'Oct 20', 'Done Oct 20');
    add('To do', 'Nov 2');
    expect(upcomingThisMonth().count).toBe(base);
    add('To do', 'Oct 31');
    expect(upcomingThisMonth()).toEqual({ count: base + 1, sub: `${base + 1} items` });
  });

  it('shows Upcoming after Completed on Home with no count beside the label', () => {
    renderApp('home.main', 'member');
    const chip = dom.getByRole('button', { name: /Upcoming/ });
    expect(chip.previousElementSibling).toHaveTextContent('Completed');
    expect(chip.querySelector('.hm-count')).toBeNull();
    expect(chip).toHaveTextContent('5 items');
  });

  it('shows the overdue line in red on Home', () => {
    renderApp('home.main', 'pm');
    const chip = dom.getByRole('button', { name: /Assigned/ });
    expect(chip.querySelector('.danger')).toHaveTextContent('1 overdue');
  });
});
