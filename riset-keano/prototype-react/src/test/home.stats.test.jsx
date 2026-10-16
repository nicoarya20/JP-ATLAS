// Home stat chips for Member and Manager come from D.tasks: open + overdue, in progress + most urgent due, done this week.
import { afterEach, describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { setRole } from '../core/session';
import { myTaskStats } from '../screens/home/home.stats';
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

  it('shows the overdue line in red on Home', () => {
    renderApp('home.main', 'pm');
    const chip = dom.getByRole('button', { name: /Assigned/ });
    expect(chip.querySelector('.danger')).toHaveTextContent('1 overdue');
  });
});
