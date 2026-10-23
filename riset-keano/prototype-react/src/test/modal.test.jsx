// Modal screens (registry modal: true): new task / project / event slide up over the screen they opened from,
// show Cancel instead of the back chevron, and slide down before they leave the history.
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen as dom, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

const shown = () => document.querySelector('.scr-slot > .scr');
const under = () => document.querySelector('.modal-under');
const fab = () => document.querySelector('.glassbar-fab');

describe('modal create screens', () => {
  it('slides New task up over the list, which stays drawn inert underneath', async () => {
    renderApp('tasks.my', 'pm');
    await userEvent.click(fab());
    expect(window.location.hash).toBe('#tasks.write');
    expect(shown()).toHaveClass('is-modal', 'is-modal-enter');
    expect(under()).toHaveAttribute('inert');
    expect(under()).toHaveAttribute('aria-hidden', 'true');
    const cancel = dom.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveTextContent('');                                          // a down chevron, no text
    expect(cancel.querySelector('svg.lucide-chevron-down')).toBeInTheDocument();
    expect(dom.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();   // the list's own bar is hidden
  });

  it('Cancel slides it down first, then returns to the list', async () => {
    renderApp('tasks.my', 'pm');
    await userEvent.click(fab());
    fireEvent.click(dom.getByRole('button', { name: 'Cancel' }));
    expect(shown()).toHaveClass('is-modal-closing');
    expect(under()).toHaveClass('is-closing');
    expect(window.location.hash).toBe('#tasks.write');
    await waitFor(() => expect(window.location.hash).toBe('#tasks.my'));
    expect(under()).toBeNull();
    expect(shown()).not.toHaveClass('is-modal');
  });

  it('keeps the screen underneath mounted, so its scroll and state survive the round trip', async () => {
    renderApp('tasks.my', 'pm');
    const list = shown();
    list.querySelector('.content').scrollTop = 240;
    await userEvent.click(fab());
    expect(under().querySelector('.scr')).toBe(list);                   // the same node, moved under the modal
    fireEvent.click(dom.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(window.location.hash).toBe('#tasks.my'));
    expect(shown()).toBe(list);
    expect(list.querySelector('.content').scrollTop).toBe(240);
  });

  it('switches Just write / Fill form in place: no new slide, and Cancel still leaves the whole flow', async () => {
    renderApp('tasks.my', 'pm');
    await userEvent.click(fab());
    await userEvent.click(dom.getByText('Fill form'));
    expect(window.location.hash).toBe('#tasks.form');
    expect(shown()).toHaveClass('is-modal');
    expect(shown()).not.toHaveClass('is-modal-enter');
    const [navCancel] = dom.getAllByRole('button', { name: 'Cancel' });   // nav bar first, then the footer's
    fireEvent.click(navCancel);
    await waitFor(() => expect(window.location.hash).toBe('#tasks.my'));
  });

  it('slides down from the footer Cancel too', async () => {
    renderApp('events.list', 'pm');
    await userEvent.click(fab());
    expect(window.location.hash).toBe('#events.new');
    const cancels = dom.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(cancels[cancels.length - 1]);
    expect(shown()).toHaveClass('is-modal-closing');
    await waitFor(() => expect(window.location.hash).toBe('#events.list'));
  });

  it('does not replay the slide when a later step comes back to it', async () => {
    renderApp('projects.list', 'pm');
    await userEvent.click(fab());
    expect(shown()).toHaveClass('is-modal-enter');
    await userEvent.click(dom.getAllByRole('button', { name: 'Choose' })[0]);
    expect(window.location.hash).toBe('#projects.story');
    expect(shown()).not.toHaveClass('is-modal');                         // later steps are plain pushed pages
    expect(dom.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(window.location.hash).toBe('#projects.new');
    expect(shown()).toHaveClass('is-modal');
    expect(shown()).not.toHaveClass('is-modal-enter');
  });

  it('opened with no history (index link): no slide, nothing underneath, Cancel stays put', async () => {
    renderApp('tasks.write', 'pm');
    expect(shown()).toHaveClass('is-modal');
    expect(shown()).not.toHaveClass('is-modal-enter');
    expect(under()).toBeNull();
    fireEvent.click(dom.getByRole('button', { name: 'Cancel' }));
    await act(async () => {});
    expect(shown()).not.toHaveClass('is-modal-closing');
    expect(window.location.hash).toBe('#tasks.write');
  });
});
