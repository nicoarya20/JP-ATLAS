// Inbox ② Latest updates: "Mark all as read" clears Today's unread dots, and they stay cleared after leaving the Inbox.
import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen as dom } from '@testing-library/react';
import '../screens';
import { resetInboxRead } from '../screens/inbox/inbox.store';
import { renderApp } from './render';

const unread = () => dom.queryAllByRole('img', { name: 'Unread' });

afterEach(resetInboxRead);

describe.each(['member', 'pm', 'admin'])('Latest updates as %s', role => {
  it('Mark all as read drops every unread dot and says so', () => {
    renderApp('inbox.updates', role);
    expect(unread().length).toBeGreaterThan(0);
    fireEvent.click(dom.getByRole('button', { name: 'Mark all as read' }));
    expect(unread()).toHaveLength(0);
    expect(dom.getByText('All marked as read')).toBeInTheDocument();
  });
});

describe('Latest updates read state', () => {
  it('stays read when the Inbox is left and opened again', async () => {
    renderApp('inbox.updates', 'pm');
    fireEvent.click(dom.getByRole('button', { name: 'Mark all as read' }));
    fireEvent.click(dom.getByRole('tab', { name: /Needs your response/ }));
    await act(async () => {});
    fireEvent.click(dom.getByRole('tab', { name: /Latest updates/ }));
    await act(async () => {});
    expect(dom.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
    expect(unread()).toHaveLength(0);
  });
});
