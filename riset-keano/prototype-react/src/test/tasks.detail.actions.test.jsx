// Tasks ⑧–⑫ detail actions: Start working, Mark done, Request review, Approve, Return and Reopen change the task's
// status through tasks.store, log it in Chat & history and reopen the same task on the screen for its new status.
// Return and Cancel need a reason; Cancel takes the task out of every list and into Archive.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { note } from '../screens/tasks/tasks.shared';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const btn = name => dom.getByRole('button', { name });
const tap = name => fireEvent.click(btn(name));
const heading = no => dom.getByRole('heading', { name: D.task(no).title });
const history = () => dom.getByText('Chat & history').closest('section');

/** Start on the detail screen of task #no, opened from All tasks like a user would. */
function detail(no, role = 'pm') {
  renderApp('tasks.all', role);
  fireEvent.click(dom.getByText(D.task(no).title));
  expect(heading(no)).toBeInTheDocument();
}

afterEach(resetTasks);

describe('task detail actions', () => {
  it('Start working moves a To do task to In progress and shows it there; Back returns to the list', () => {
    detail(14);
    tap('Start working');
    expect(D.task(14).status).toBe('In progress');
    expect(window.location.hash).toBe('#tasks.detail-progress');
    expect(heading(14)).toBeInTheDocument();
    expect(within(history()).getByText('Nico started working')).toBeInTheDocument();
    // #14 has review off, so In progress offers Mark done rather than Request review.
    expect(btn('Mark done')).toBeInTheDocument();
    expect(dom.queryByRole('button', { name: 'Request review' })).not.toBeInTheDocument();
    tap('Back');
    expect(window.location.hash).toBe('#tasks.all');
  });

  it('Mark done finishes the task, and Reopen brings it back to In progress', () => {
    detail(14);
    tap('Mark done');
    expect(D.task(14).status).toBe('Done');
    expect(D.task(14).when).toBe('Done Oct 7');
    tap('Reopen');
    expect(D.task(14).status).toBe('In progress');
    expect(within(history()).getByText('Nico reopened this task')).toBeInTheDocument();
  });

  it("Request review sends the task to its own reviewer and opens the review screen for it", () => {
    detail(12);
    tap('Request review');
    expect(D.task(12).status).toBe('In review');
    expect(window.location.hash).toBe('#tasks.detail-review');
    expect(heading(12)).toBeInTheDocument();
    expect(dom.getByText('You asked Admin to review this task')).toBeInTheDocument();
    expect(within(history()).getByText('Nico requested review · reviewer: Admin')).toBeInTheDocument();
  });

  it("names each In review task's own reviewer in list notes", () => {
    detail(12);
    tap('Request review');
    expect(note(D.task(12))).toBe('Awaiting review by Admin');
    expect(note(D.task(17))).toBe('Waiting for my review');
  });

  it('Approve marks the reviewed task Done and shows it with Reopen', () => {
    detail(17);
    tap('Approve');
    expect(D.task(17).status).toBe('Done');
    expect(window.location.hash).toBe('#tasks.detail-progress');
    expect(heading(17)).toBeInTheDocument();
    expect(btn('Reopen')).toBeInTheDocument();
    expect(within(history()).getByText('Nico approved this task')).toBeInTheDocument();
  });
});

describe('Return sheet', () => {
  it('needs a reason; a quick pick fills it and Return sends the task back to In progress', () => {
    detail(17);
    tap('Return');
    const sheet = within(dom.getByRole('dialog'));
    const send = sheet.getByRole('button', { name: 'Return' });
    expect(send).toBeDisabled();
    fireEvent.click(sheet.getByRole('button', { name: 'Not as requested' }));
    expect(sheet.getByRole('textbox', { name: /Reason/ })).toHaveValue('Not as requested');
    expect(send).toBeEnabled();
    fireEvent.click(send);
    expect(D.task(17).status).toBe('In progress');
    expect(D.taskDetail[17].returned).toBe(1);
    expect(window.location.hash).toBe('#tasks.detail-progress');
    expect(within(history()).getByText('Nico returned this task ×1: Not as requested')).toBeInTheDocument();
  });

  it('keeps Return disabled for a reason of only spaces', () => {
    detail(17);
    tap('Return');
    const sheet = within(dom.getByRole('dialog'));
    fireEvent.change(sheet.getByRole('textbox', { name: /Reason/ }), { target: { value: '   ' } });
    expect(sheet.getByRole('button', { name: 'Return' })).toBeDisabled();
  });
});

describe('Cancel sheet', () => {
  const open = no => {
    detail(no);
    fireEvent.click(btn('Task actions'));
    fireEvent.click(within(dom.getByRole('menu')).getByRole('menuitem', { name: 'Cancel task' }));
    return within(dom.getByRole('dialog'));
  };

  it('starts with no reason picked; Other also needs a note', () => {
    const sheet = open(14);
    const send = sheet.getByRole('button', { name: 'Cancel task' });
    expect(sheet.getAllByRole('radio').some(r => r.checked)).toBe(false);
    expect(send).toBeDisabled();
    fireEvent.click(sheet.getByRole('radio', { name: 'Other' }));
    expect(send).toBeDisabled();
    fireEvent.change(sheet.getByRole('textbox', { name: /Note/ }), { target: { value: 'Merged into #12' } });
    expect(send).toBeEnabled();
  });

  it('moves the task out of the lists and into Archive, then closes the detail', () => {
    const sheet = open(14);
    fireEvent.click(sheet.getByRole('radio', { name: 'No longer needed' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Cancel task' }));
    expect(D.tasks.some(t => t.no === 14)).toBe(false);
    expect(D.archive[0]).toMatchObject({ kind: 'TASK', title: '#14 Write the API spec', by: 'Nico', date: 'Oct 7' });
    expect(D.taskDetail[14].history.at(-1)[0]).toBe('Nico canceled this task: No longer needed');
    expect(window.location.hash).toBe('#tasks.all');
    expect(dom.queryByText('Write the API spec')).not.toBeInTheDocument();
    expect(dom.getByText('Task moved to Archive')).toBeInTheDocument();
  });

  it('lists the canceled task in Archive', () => {
    open(14);
    fireEvent.click(dom.getByRole('radio', { name: 'Created by mistake' }));
    fireEvent.click(within(dom.getByRole('dialog')).getByRole('button', { name: 'Cancel task' }));
    renderApp('archive.list', 'pm');
    expect(dom.getAllByText('#14 Write the API spec')[0]).toBeInTheDocument();
  });

  it('comes back in place after a reset', () => {
    const order = D.tasks.map(t => t.no);
    const sheet = open(14);
    fireEvent.click(sheet.getByRole('radio', { name: 'No longer needed' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Cancel task' }));
    resetTasks();
    expect(D.tasks.map(t => t.no)).toEqual(order);
    expect(D.archivedTasks).toHaveLength(0);
    expect(D.archive.some(a => a.title.startsWith('#14 '))).toBe(false);
  });
});
