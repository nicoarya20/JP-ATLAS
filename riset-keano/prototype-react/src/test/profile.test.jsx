// Profile overlay (profile.me): a full-height sheet over the screen; X, Escape and a swipe down close it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { D } from '../data/sample';
import { resetProfile } from '../screens/profile/profile.store';
import { renderApp } from './render';

const overlay = () => dom.queryByRole('dialog', { name: /Profile/ });
const sheetEl = () => document.querySelector('.fs');
const dot = () => document.querySelector('.pf-photo .pf-dot');

async function openProfile(role = 'pm') {
  renderApp('home.main', role);
  await userEvent.click(dom.getByRole('tab', { name: 'More' }));
  await userEvent.click(dom.getByRole('button', { name: `${D.me().full}, open profile` }));
  expect(overlay()).toBeInTheDocument();
}

/** Drag the grabber bar down by dy px and let go. */
function swipe(dy) {
  const bar = document.querySelector('.fs-bar');
  act(() => {
    fireEvent.pointerDown(bar, { clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(bar, { clientY: 100 + dy / 2, pointerId: 1 });
    fireEvent.pointerMove(bar, { clientY: 100 + dy, pointerId: 1 });
  });
  expect(sheetEl().style.getPropertyValue('--fs-drag')).toBe(`${dy}px`); // the sheet follows the finger
  act(() => { fireEvent.pointerUp(bar, { clientY: 100 + dy, pointerId: 1 }); });
}

beforeEach(resetProfile);

describe('Profile overlay', () => {
  it('shows photo, note, Edit profile, the menu and Sign out', async () => {
    await openProfile();
    const me = D.me();
    expect(dom.getByRole('heading', { name: me.full })).toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Add a note' })).toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    for (const name of ['My tasks', 'My calendar', 'Inbox', 'Settings', 'Help & resources']) {
      expect(within(overlay()).getByText(name)).toBeInTheDocument();
    }
    expect(dom.getByText(me.email)).toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('closes with the X in the top-left corner', async () => {
    await openProfile();
    await userEvent.click(dom.getByRole('button', { name: 'Close' }));
    expect(overlay()).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#home.main');
  });

  it('closes on Escape', async () => {
    await openProfile();
    await userEvent.keyboard('{Escape}');
    expect(overlay()).not.toBeInTheDocument();
  });

  it('closes on a long swipe down and springs back from a short one', async () => {
    await openProfile();
    swipe(20);
    expect(overlay()).toBeInTheDocument();
    expect(sheetEl().style.getPropertyValue('--fs-drag')).toBe('0px');
    expect(sheetEl()).not.toHaveClass('is-dragging');
    swipe(300);
    expect(overlay()).not.toBeInTheDocument();
  });

  it('saves a note on Enter, keeps it after reopening, and Escape cancels an edit without closing', async () => {
    await openProfile();
    await userEvent.click(dom.getByRole('button', { name: 'Add a note' }));
    await userEvent.type(dom.getByRole('textbox', { name: 'Note' }), 'Back from leave{Enter}');
    expect(dom.getByRole('button', { name: 'Note: Back from leave. Edit note' })).toBeInTheDocument();

    await userEvent.click(dom.getByRole('button', { name: 'Close' }));
    await userEvent.click(dom.getByRole('tab', { name: 'More' }));
    await userEvent.click(dom.getByRole('button', { name: `${D.me().full}, open profile` }));
    await userEvent.click(dom.getByRole('button', { name: 'Note: Back from leave. Edit note' }));
    await userEvent.type(dom.getByRole('textbox', { name: 'Note' }), ' today{Escape}');
    expect(overlay()).toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Note: Back from leave. Edit note' })).toBeInTheDocument();
  });

  it('clears the note when it is saved empty', async () => {
    await openProfile();
    await userEvent.click(dom.getByRole('button', { name: 'Add a note' }));
    await userEvent.type(dom.getByRole('textbox', { name: 'Note' }), 'Busy');
    await userEvent.tab();                                     // leaving the field saves
    await userEvent.click(dom.getByRole('button', { name: 'Note: Busy. Edit note' }));
    await userEvent.clear(dom.getByRole('textbox', { name: 'Note' }));
    await userEvent.keyboard('{Enter}');
    expect(dom.getByRole('button', { name: 'Add a note' })).toBeInTheDocument();
  });

  it('switches presence between Online and Offline on the photo dot', async () => {
    await openProfile();
    expect(dot()).toHaveClass('is-on');
    expect(dom.getByText('Online')).toBeInTheDocument();
    await userEvent.click(dom.getByRole('switch', { name: 'Show me as online' }));
    expect(dot()).not.toHaveClass('is-on');
    expect(dom.getByText('Offline')).toBeInTheDocument();
  });

  it('copies the email', async () => {
    const user = userEvent.setup();
    await openProfile();
    const write = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(dom.getByRole('button', { name: 'Copy email' }));
    expect(write).toHaveBeenCalledWith(D.me().email);
    expect(await dom.findByText('Email copied')).toBeInTheDocument();
  });

  it('opens a menu destination and closes itself', async () => {
    await openProfile();
    await userEvent.click(within(overlay()).getByText('My calendar'));
    expect(window.location.hash).toBe('#profile.calendar');
    expect(overlay()).not.toBeInTheDocument();
  });

  it('signs out to the login screen', async () => {
    await openProfile('member');
    await userEvent.click(dom.getByRole('button', { name: 'Sign out' }));
    expect(window.location.hash).toBe('#auth.login');
  });
});
