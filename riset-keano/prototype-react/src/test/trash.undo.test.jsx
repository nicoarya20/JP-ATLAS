// Trash ③: the Undo snackbar over the Events list restores the event (needs the Events module registered).
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

describe('trash undo', () => {
  it('restores the event from the snackbar', async () => {
    renderApp('trash.undo', 'pm');
    expect(dom.getByText('Event moved to Trash')).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Undo' }));
    expect(await dom.findByText('Event restored')).toBeInTheDocument();
  });
});
