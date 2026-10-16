// More tab: instead of a screen it unfolds the tab bar into the More panel over a dimmed screen.
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { D } from '../data/sample';
import { renderApp } from './render';

const panel = () => dom.queryByRole('group', { name: 'More' });
const shell = () => document.querySelector('.tb-shell');
const scrim = () => document.querySelector('.glassbar-scrim');
const bubblePos = () => document.querySelector('.tb-bubble').style.getPropertyValue('--tb-pos');
const tapMore = () => userEvent.click(dom.getByRole('tab', { name: 'More' }));

describe('More panel', () => {
  it('unfolds from the tab bar without leaving the screen', async () => {
    renderApp('home.main', 'member');
    expect(panel()).not.toBeInTheDocument();          // folded: hidden from screen readers
    await tapMore();
    expect(window.location.hash).toBe('#home.main');
    expect(panel()).toBeInTheDocument();
    expect(shell()).toHaveClass('is-open');
    expect(scrim()).toHaveClass('is-open');
    expect(bubblePos()).toBe('4');                     // the bubble moves to More while it is open
    expect(dom.getByRole('button', { name: `Inbox, ${D.inbox.respond.length} new` })).toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('folds away on More again, on the dim and on Escape, and the bubble goes back', async () => {
    renderApp('tasks.my', 'member');
    await tapMore();
    await tapMore();
    expect(panel()).not.toBeInTheDocument();
    expect(bubblePos()).toBe('1');
    await tapMore();
    await userEvent.click(scrim());
    expect(shell()).not.toHaveClass('is-open');
    await tapMore();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(scrim()).not.toHaveClass('is-open');
  });

  it('opens a destination and folds itself', async () => {
    renderApp('home.main', 'member');
    await tapMore();
    await userEvent.click(dom.getByRole('button', { name: 'Team' }));
    expect(window.location.hash).toBe('#team.list');
    expect(panel()).not.toBeInTheDocument();
  });

  it('labels the deleted-items tile Archive', async () => {
    renderApp('home.main', 'member');
    await tapMore();
    expect(dom.queryByRole('button', { name: 'Trash' })).not.toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Archive' }));
    expect(window.location.hash).toBe('#trash.list');
  });

  it('folds on another tab and goes there', async () => {
    renderApp('home.main', 'member');
    await tapMore();
    await userEvent.click(dom.getByRole('tab', { name: 'Events' }));
    expect(window.location.hash).toBe('#events.list');
    expect(panel()).not.toBeInTheDocument();
  });

  it('only folds when the tab under it is picked again', async () => {
    renderApp('projects.list', 'pm');
    await tapMore();
    await userEvent.click(dom.getByRole('tab', { name: 'Projects' }));
    expect(window.location.hash).toBe('#projects.list');
    expect(panel()).not.toBeInTheDocument();
    expect(bubblePos()).toBe('2');
  });

  it('shows Users with its pending count to Admin only', async () => {
    renderApp('home.main', 'admin');
    await tapMore();
    expect(dom.getByRole('button', { name: `Users, ${D.users.counts.pending} new` })).toBeInTheDocument();
  });

  it('has no Users for a Member, and Sign out leaves for the login screen', async () => {
    renderApp('home.main', 'member');
    await tapMore();
    expect(dom.queryByRole('button', { name: /^Users/ })).not.toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Sign out' }));
    expect(window.location.hash).toBe('#auth.login');
  });
});
