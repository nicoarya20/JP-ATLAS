// Home "+" opens Create in the same overlay as the profile (kit FullSheet), sized to its rows.
import { describe, expect, it } from 'vitest';
import { act, screen as dom, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

const overlay = () => dom.queryByRole('dialog', { name: /Create/ });

async function openCreate(role = 'pm') {
  renderApp('home.main', role);
  await userEvent.click(dom.getByRole('button', { name: 'Create' }));
  expect(overlay()).toBeInTheDocument();
}

describe('Create overlay', () => {
  it('uses the profile overlay, fitted to its content, not the library bottom sheet', async () => {
    await openCreate();
    expect(overlay()).toHaveClass('fs', 'is-fit');
    expect(document.querySelector('.fs-dim')).toBeInTheDocument();
    expect(document.querySelector('.react-cupertino-ui-bottom-sheet__content')).toBeNull();
    for (const name of ['Task', 'Project', 'Event', 'Import tasks', 'Request leave']) {
      expect(within(overlay()).getByText(name)).toBeInTheDocument();
    }
  });

  it('closes with the X', async () => {
    await openCreate();
    await userEvent.click(within(overlay()).getByRole('button', { name: 'Close' }));
    await act(async () => {});
    expect(overlay()).toBeNull();
  });

  it('closes and opens the picked screen', async () => {
    await openCreate();
    await userEvent.click(within(overlay()).getByText('Task'));
    await act(async () => {});
    expect(overlay()).toBeNull();
    expect(window.location.hash).toBe('#tasks.write');
  });

  it('leaves the other overlays at full height', async () => {
    renderApp('home.main', 'pm');
    await userEvent.click(dom.getByRole('tab', { name: 'More' }));
    await userEvent.click(dom.getByRole('button', { name: /open profile/ }));
    expect(dom.getByRole('dialog', { name: /Profile/ })).not.toHaveClass('is-fit');
  });
});
