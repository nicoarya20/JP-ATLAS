// Archive ③: an event archived from its ⋯ menu lands on the Events list with an Undo snackbar (needs the Events module);
// Undo puts that event back.
import { afterEach, describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { D } from '../data/sample';
import { resetEvents } from '../screens/events/events.store';
import { renderApp } from './render';

afterEach(resetEvents);

/** Open the design review's ⋯ menu and confirm Move to Archive. */
async function archiveReview() {
  renderApp('events.detail-upcoming', 'pm');
  const dots = dom.getByRole('button', { name: 'Event actions' });
  expect(dots).toHaveClass('menu-btn');
  await userEvent.click(dots);
  await userEvent.click(dom.getByRole('menuitem', { name: 'Move to Archive' }));
  expect(await dom.findByText('Archive event?')).toBeInTheDocument();
  expect(dom.getByText(/can be restored anytime/)).toBeInTheDocument();
  await userEvent.click(dom.getByRole('button', { name: 'Move to Archive' }));
}

describe('archive undo', () => {
  it('archives an event from its ⋯ menu: it leaves the list and Archive lists it', async () => {
    await archiveReview();
    expect(window.location.hash).toBe('#archive.undo');
    expect(dom.getByText('Event moved to Archive')).toBeInTheDocument();
    expect(dom.queryByText('Onboarding design review')).not.toBeInTheDocument();
    expect(D.archive.some(a => a.event === 'review')).toBe(true);
  });

  it('restores the event from the snackbar', async () => {
    await archiveReview();
    await userEvent.click(dom.getByRole('button', { name: 'Undo' }));
    expect(await dom.findByText('Event restored')).toBeInTheDocument();
    expect(dom.queryByText('Event moved to Archive')).not.toBeInTheDocument();
    expect(dom.getByText('Onboarding design review')).toBeInTheDocument();
    expect(D.archive.some(a => a.event === 'review')).toBe(false);
  });

  it('shows no snackbar when opened with nothing archived', () => {
    renderApp('archive.undo', 'pm');
    expect(dom.queryByText('Event moved to Archive')).not.toBeInTheDocument();
  });
});
