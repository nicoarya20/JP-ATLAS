// Tasks ①b Filter & sort: the overlay edits a draft; Apply re-opens the list with it, which narrows and orders the
// cards (My tasks, All tasks and Kanban), Reset goes back to the list's default, the icon dot shows a filter is on.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { renderApp } from './render';

const atlasName = D.project('atlas').name;
const atlasActive = () => D.tasks.filter(t => t.project === atlasName && t.status !== 'Done');
const icon = () => dom.getByRole('button', { name: 'Filter and sort' });
const openFilter = () => { fireEvent.click(icon()); return within(dom.getByRole('dialog')); };
const apply = sheet => fireEvent.click(sheet.getByRole('button', { name: 'Apply' }));
const shown = t => !!dom.queryByText(t.title);
/** Titles that are on screen, in document order. */
const order = titles => titles.map(x => dom.getByText(x)).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  .map(el => el.textContent);

describe('tasks filter & sort', () => {
  it('opens one sheet with the status, project and priority filters and the sort order', () => {
    renderApp('tasks.my', 'member');
    const sheet = openFilter();
    expect(sheet.getByRole('heading', { name: 'Filter & sort' })).toBeInTheDocument();
    for (const s of ['All active', 'To do', 'In progress', 'In review', 'Done']) expect(sheet.getByRole('button', { name: s })).toBeInTheDocument();
    expect(sheet.getByRole('button', { name: 'All active' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('combobox', { name: 'Project' })).toHaveDisplayValue('All projects');
    expect(sheet.getByRole('button', { name: 'High' })).toBeInTheDocument();
    expect(sheet.getByRole('radio', { name: 'Due date' })).toBeChecked();
    expect(sheet.getAllByRole('radio')).toHaveLength(4);
  });

  it('opens as a full-height overlay like the profile, closed by the X', () => {
    renderApp('tasks.my', 'member');
    const dialog = openFilter();
    expect(dom.getByRole('dialog')).toHaveClass('fs');
    expect(dialog.getByRole('heading', { name: 'Filter & sort' })).toHaveAttribute('data-sheet-drag');
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    expect(dom.queryByRole('heading', { name: 'Filter & sort' })).not.toBeInTheDocument();
  });

  it('scopes All tasks to Atlas inside the sheet (dot on the icon) instead of a pill on the list', () => {
    renderApp('tasks.all', 'pm');
    expect(dom.queryByText(/^Project:/)).not.toBeInTheDocument();
    expect(icon()).toHaveClass('is-on');
    expect(openFilter().getByRole('combobox', { name: 'Project' })).toHaveValue('atlas');
  });

  it('closes on Apply without a toast: the list itself changes', () => {
    renderApp('tasks.my', 'pm');
    apply(openFilter());
    expect(dom.queryByRole('heading', { name: 'Filter & sort' })).not.toBeInTheDocument();
    expect(dom.queryByText('Filter applied')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#tasks.my');
  });

  it('shows my done tasks under Done when the status filter is Done', () => {
    renderApp('tasks.my', 'pm');
    const done = D.tasks.filter(t => t.who === D.me().name && t.status === 'Done');
    expect(done.some(shown)).toBe(false);
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Done' }));
    apply(sheet);
    expect(dom.getByRole('heading', { name: `Done${done.length}` })).toBeInTheDocument();
    expect(done.every(shown)).toBe(true);
    expect(D.tasks.filter(t => t.status !== 'Done').some(shown)).toBe(false);
    expect(icon()).toHaveClass('is-on');
  });

  it('narrows All tasks by priority without a count footer', () => {
    renderApp('tasks.all', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'High' }));
    apply(sheet);
    const high = atlasActive().filter(t => t.priority === 'High');
    expect(high.every(shown)).toBe(true);
    expect(atlasActive().filter(t => t.priority !== 'High').some(shown)).toBe(false);
    expect(dom.queryByText(/ of \d+ tasks/)).toBeNull();
  });

  it('picks another project from a real picker', () => {
    renderApp('tasks.all', 'pm');
    const sinar = D.project('sinar');
    const sheet = openFilter();
    fireEvent.change(sheet.getByRole('combobox', { name: 'Project' }), { target: { value: 'sinar' } });
    expect(sheet.getByRole('combobox', { name: 'Project' })).toHaveDisplayValue(sinar.name);
    apply(sheet);
    const list = D.tasks.filter(t => t.project === sinar.name && t.status !== 'Done');
    expect(list.every(shown)).toBe(true);
    expect(atlasActive().some(shown)).toBe(false);
  });

  it('sorts All tasks by title and keeps the pick when the sheet opens again', () => {
    renderApp('tasks.all', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('radio', { name: 'Title (A–Z)' }));
    apply(sheet);
    const titles = atlasActive().map(t => t.title);
    expect(order(titles)).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    expect(openFilter().getByRole('radio', { name: 'Title (A–Z)' })).toBeChecked();
  });

  it('shows My tasks as one list in the picked order when not sorted by due date, review queue first', () => {
    renderApp('tasks.my', 'pm');
    expect(dom.getByRole('heading', { name: /^Overdue/ })).toBeInTheDocument();
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('radio', { name: 'Recently updated' }));
    apply(sheet);
    expect(dom.queryByRole('heading', { name: /^Overdue/ })).not.toBeInTheDocument();
    const heads = dom.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(heads[0]).toMatch(/^Waiting for my review/);
    expect(heads[1]).toMatch(/^Recently updated/);
    const own = D.tasks.filter(t => t.who === D.me().name && !['Done', 'In review'].includes(t.status));
    const titles = [...own].sort((a, b) => b.updated.localeCompare(a.updated)).map(t => t.title);
    expect(order(titles)).toEqual(titles);
  });

  it('Reset puts the draft back to the list default', () => {
    renderApp('tasks.all', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'High' }));
    fireEvent.change(sheet.getByRole('combobox', { name: 'Project' }), { target: { value: 'sinar' } });
    fireEvent.click(sheet.getByRole('radio', { name: 'Priority' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Reset' }));
    expect(sheet.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('combobox', { name: 'Project' })).toHaveValue('atlas');
    expect(sheet.getByRole('radio', { name: 'Due date' })).toBeChecked();
    apply(sheet);
    expect(atlasActive().every(shown)).toBe(true);
  });

  it('shows the dot on My tasks only once a filter is applied', () => {
    renderApp('tasks.my', 'pm');
    expect(icon()).not.toHaveClass('is-on');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('radio', { name: 'Priority' }));
    apply(sheet);
    expect(icon()).not.toHaveClass('is-on');
    const again = openFilter();
    fireEvent.click(again.getByRole('button', { name: 'High' }));
    apply(again);
    expect(icon()).toHaveClass('is-on');
  });

  it('offers Reset filters when nothing matches', () => {
    renderApp('tasks.all', 'pm');
    const sheet = openFilter();
    fireEvent.change(sheet.getByRole('combobox', { name: 'Project' }), { target: { value: 'attendance' } });
    apply(sheet);
    expect(dom.getByRole('heading', { name: 'No tasks match these filters.' })).toBeInTheDocument();
    fireEvent.click(dom.getByRole('button', { name: 'Reset filters' }));
    expect(dom.queryByText('No tasks match these filters.')).not.toBeInTheDocument();
    expect(atlasActive().every(shown)).toBe(true);
  });

  it('keeps the query when switching List / Kanban; the board keeps Done under All active', () => {
    renderApp('tasks.all', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'High' }));
    apply(sheet);
    fireEvent.click(dom.getByRole('tab', { name: 'Kanban' }));
    const high = D.tasks.filter(t => t.project === atlasName && t.priority === 'High');
    const cols = dom.getAllByRole('region', { name: /, \d+ tasks$/ }).map(c => +c.getAttribute('aria-label').match(/(\d+) tasks$/)[1]);
    expect(cols.reduce((a, b) => a + b, 0)).toBe(high.length);
    expect(high.every(shown)).toBe(true);
    fireEvent.click(dom.getByRole('tab', { name: 'List' }));
    const highActive = atlasActive().filter(t => t.priority === 'High');
    expect(highActive.every(shown)).toBe(true);
    expect(atlasActive().filter(t => t.priority !== 'High').some(shown)).toBe(false);
  });
});
