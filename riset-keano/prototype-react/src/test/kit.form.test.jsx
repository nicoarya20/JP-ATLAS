// Kit form parts: Select fires its nav props or picks from options, Switch toggles, Snack action navigates; the toast shell.
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, screen as dom } from '@testing-library/react';
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
function P() {
  const [v, setV] = useState('b');
  return <Select block label="Letter" value={v} onChange={setV} options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Bravo' }]} />;
}
screen('t.form', { title: 'Form', group: 'Test', Component: F });
screen('t.form.pick', { title: 'Pick', group: 'Test', Component: P });
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

  it('Select with options is a real picker that shows the picked label', () => {
    renderApp('t.form.pick');
    const pick = dom.getByRole('combobox', { name: 'Letter' });
    expect(pick).toHaveValue('b');
    expect(pick.closest('.select')).toHaveTextContent(/^BravoAlphaBravo$/);
    fireEvent.change(pick, { target: { value: 'a' } });
    expect(pick).toHaveValue('a');
    expect(pick.closest('.select').firstChild).toHaveTextContent('Alpha');
  });

  it('shows the toast as the app toast at the top centre, without the glass panel', async () => {
    renderApp('t.form');
    await userEvent.click(dom.getByRole('button', { name: 'Member' }));
    const toast = (await dom.findByText('Member · Project Manager')).closest('.react-cupertino-ui-toast');
    expect(toast).toHaveClass('app-toast', 'position-top-center');
    expect(toast).not.toHaveClass('is-glass');
  });
});
