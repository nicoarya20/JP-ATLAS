// Users module: the signed-in Admin's own row is read-only; Approval actions toast.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

describe('users', () => {
  it('lists approved users with the Admin row read-only', () => {
    renderApp('users.roles', 'admin');
    expect(dom.getByText('Ayu Lestari (You)')).toBeInTheDocument();
    expect(dom.getAllByRole('button', { name: 'Deactivate' })).toHaveLength(5);
  });

  it('approves a pending user with a toast', async () => {
    renderApp('users.approve', 'admin');
    await userEvent.click(dom.getByRole('button', { name: 'Approve' }));
    expect(await dom.findByText('User approved as Member')).toBeInTheDocument();
  });
});
