// Kit form parts: Select fires its nav props, Switch toggles, Snack action navigates.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { screen } from '../core/registry';
import { Label, Select, Snack, Switch } from '../kit';
import { renderApp } from './render';

// test-only screens
function F() {
  return (
    <div>
      <Label>Group</Label>
      <Select toast="Member · Project Manager">Member</Select>
      <Switch on label="Event reminders" />
      <Snack action="Undo" go="t.form.done" toast="Event restored">Event moved to Archive</Snack>
    </div>
  );
}
screen('t.form', { title: 'Form', group: 'Test', Component: F });
screen('t.form.done', { title: 'Done', group: 'Test', Component: () => <h1>Restored screen</h1> });

describe('kit form parts', () => {
  it('Select shows its toast', async () => {
    renderApp('t.form');
    expect(dom.getByRole('heading', { name: 'Group' })).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Member' }));
    expect(await dom.findByText('Member · Project Manager')).toBeInTheDocument();
  });

  it('Switch starts on and toggles off', async () => {
    renderApp('t.form');
    const sw = dom.getByRole('switch', { name: 'Event reminders' });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    expect(sw).not.toBeChecked();
  });

  it('Snack action navigates and toasts', async () => {
    renderApp('t.form');
    expect(dom.getByRole('status')).toHaveTextContent('Event moved to Archive');
    await userEvent.click(dom.getByRole('button', { name: 'Undo' }));
    expect(dom.getByRole('heading', { name: 'Restored screen' })).toBeInTheDocument();
    expect(await dom.findByText('Event restored')).toBeInTheDocument();
  });
});
