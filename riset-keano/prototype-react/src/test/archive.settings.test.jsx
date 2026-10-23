// Archive and Settings: Admin-only actions and role-specific leave copy.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

describe('archive', () => {
  it('shows Delete forever only to Admins', () => {
    renderApp('archive.list', 'member');
    expect(dom.queryByRole('button', { name: 'Delete forever' })).not.toBeInTheDocument();
    expect(dom.getAllByRole('button', { name: 'Restore' })).toHaveLength(5);
  });

  it('opens the delete-forever sheet for an Admin', async () => {
    renderApp('archive.list', 'admin');
    await userEvent.click(dom.getAllByRole('button', { name: 'Delete forever' })[0]);
    expect(await dom.findByText('Delete forever?')).toBeInTheDocument();
  });
});

describe('settings', () => {
  it('hides team settings from Members and offers Request leave', async () => {
    renderApp('settings.main', 'member');
    expect(dom.queryByText('Team settings (Admin only)')).not.toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Request leave' }));
    expect(await dom.findByText('Request is sent to your project Manager or Admin.')).toBeInTheDocument();
  });

  it('lets an Admin set leave directly and toggle team settings', async () => {
    renderApp('settings.main', 'admin');
    const ai = dom.getByRole('switch', { name: 'AI features' });
    expect(ai).toBeChecked();
    await userEvent.click(ai);
    expect(ai).not.toBeChecked();
    await userEvent.click(dom.getByRole('button', { name: 'Set leave' }));
    expect(await dom.findByText('Admin leave applies immediately, no approval.')).toBeInTheDocument();
  });

  it('signs out from a red button and leaves for the login screen', async () => {
    renderApp('settings.main', 'member');
    const out = dom.getByRole('button', { name: 'Sign out' });
    expect(out).toHaveClass('variant-destructive');
    await userEvent.click(out);
    expect(window.location.hash).toBe('#auth.login');
  });
});
