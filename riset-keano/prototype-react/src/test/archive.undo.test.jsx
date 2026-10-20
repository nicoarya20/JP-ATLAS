// Archive ③: an event archived from its ⋯ menu lands on the Events list with an Undo snackbar (needs the Events module).
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

describe('archive undo', () => {
  it('restores the event from the snackbar', async () => {
    renderApp('archive.undo', 'pm');
    expect(dom.getByText('Event moved to Archive')).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Undo' }));
    expect(await dom.findByText('Event restored')).toBeInTheDocument();
  });

  it('archives an event from its ⋯ menu', async () => {
    renderApp('events.detail-upcoming', 'pm');
    const dots = dom.getByRole('button', { name: 'Event actions' });
    expect(dots).toHaveClass('menu-btn');
    await userEvent.click(dots);
    await userEvent.click(dom.getByRole('menuitem', { name: 'Move to Archive' }));
    expect(await dom.findByText('Archive event?')).toBeInTheDocument();
    expect(dom.getByText(/can be restored anytime/)).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Move to Archive' }));
    expect(window.location.hash).toBe('#archive.undo');
  });
});
