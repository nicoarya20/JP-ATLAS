// Projects ①b Filter & sort: the same icon + full-height overlay as Tasks and Events, replacing the status chips and the
// Sort pill. Apply re-opens the list with the query, which narrows the projects (status, health) and orders them.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { renderApp } from './render';

const icon = () => dom.getByRole('button', { name: 'Filter and sort' });
const openFilter = () => { fireEvent.click(icon()); return within(dom.getByRole('dialog')); };
/** One labelled field of the overlay (Status and Health both have an "All" chip). */
const field = (sheet, name) => within(sheet.getByRole('heading', { name, level: 3 }).closest('.field'));
const apply = sheet => fireEvent.click(sheet.getByRole('button', { name: 'Apply' }));
/** Project names in the order the cards show them. */
const names = () => D.projects.map(p => p.name).filter(n => dom.queryByText(n))
  .sort((a, b) => (dom.getByText(a).compareDocumentPosition(dom.getByText(b)) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

describe('projects filter & sort', () => {
  it('puts the filter icon on the search field and drops the status chips and the Sort pill', () => {
    renderApp('projects.list', 'pm');
    expect(icon().closest('.search-filter').querySelector('input')).toHaveAttribute('placeholder', 'Search project name or description…');
    expect(icon()).not.toHaveClass('is-on');
    expect(dom.queryByRole('button', { name: 'Active' })).not.toBeInTheDocument();
    expect(dom.queryByText(/^Sort:/)).not.toBeInTheDocument();
  });

  it('opens a full-height overlay with status, health and sort by, closed by the X', () => {
    renderApp('projects.list', 'pm');
    const sheet = openFilter();
    expect(dom.getByRole('dialog')).toHaveClass('fs');
    expect(sheet.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Status', 'Health', 'Sort by']);
    expect(field(sheet, 'Status').getAllByRole('button').map(b => b.textContent)).toEqual(['All', 'Active', 'On hold', 'Done', 'Draft', 'Canceled']);
    expect(field(sheet, 'Health').getAllByRole('button').map(b => b.textContent)).toEqual(['All', 'Needs attention', 'Overdue', 'On track']);
    expect(sheet.getByRole('radio', { name: 'Nearest deadline' })).toBeChecked();
    fireEvent.click(sheet.getByRole('button', { name: 'Close' }));
    expect(dom.queryByRole('heading', { name: 'Filter & sort' })).not.toBeInTheDocument();
  });

  it('lists every project, nearest deadline first, by default', () => {
    renderApp('projects.list', 'pm');
    expect(names()).toEqual(['Company Profile Website', 'Legacy Data Migration', 'PT Sinar Client Portal', 'Atlas Project',
      'Attendance App', 'Internal Tools']);
  });

  it('narrows to one status and lights the dot', () => {
    renderApp('projects.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(field(sheet, 'Status').getByRole('button', { name: 'Active' }));
    apply(sheet);
    expect(names()).toEqual(['Legacy Data Migration', 'PT Sinar Client Portal', 'Atlas Project']);
    expect(icon()).toHaveClass('is-on');
  });

  it('narrows to the projects that need attention', () => {
    renderApp('projects.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(field(sheet, 'Health').getByRole('button', { name: 'Needs attention' }));
    apply(sheet);
    expect(names()).toEqual(['PT Sinar Client Portal', 'Atlas Project']);
  });

  it('sorts by lowest progress or by name without lighting the dot', () => {
    renderApp('projects.list', 'pm');
    let sheet = openFilter();
    fireEvent.click(sheet.getByRole('radio', { name: 'Lowest progress' }));
    apply(sheet);
    expect(names()[0]).toBe('Attendance App');
    expect(names().at(-1)).toBe('Company Profile Website');
    expect(icon()).not.toHaveClass('is-on');
    sheet = openFilter();
    fireEvent.click(sheet.getByRole('radio', { name: 'Name (A–Z)' }));
    apply(sheet);
    expect(names()).toEqual(D.projects.map(p => p.name).sort((a, b) => a.localeCompare(b)));
  });

  it('offers Reset filters when nothing matches', () => {
    renderApp('projects.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(field(sheet, 'Status').getByRole('button', { name: 'Draft' }));
    fireEvent.click(field(sheet, 'Health').getByRole('button', { name: 'Overdue' }));
    apply(sheet);
    expect(dom.getByRole('heading', { name: 'No projects match these filters.' })).toBeInTheDocument();
    fireEvent.click(dom.getByRole('button', { name: 'Reset filters' }));
    expect(names()).toHaveLength(D.projects.length);
    expect(icon()).not.toHaveClass('is-on');
  });

  it('Reset puts the draft back to every status and health, nearest deadline', () => {
    renderApp('projects.list', 'pm');
    const sheet = openFilter();
    fireEvent.click(field(sheet, 'Status').getByRole('button', { name: 'Done' }));
    fireEvent.click(field(sheet, 'Health').getByRole('button', { name: 'On track' }));
    fireEvent.click(sheet.getByRole('radio', { name: 'Name (A–Z)' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Reset' }));
    expect(field(sheet, 'Status').getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(field(sheet, 'Health').getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('radio', { name: 'Nearest deadline' })).toBeChecked();
  });

  it('keeps the member to their own projects under the filter', () => {
    renderApp('projects.list', 'member');
    const me = D.me().name;
    const mine = D.projects.filter(p => p.members.includes(me)).map(p => p.name);
    expect(mine.length).toBeLessThan(D.projects.length);
    expect([...names()].sort()).toEqual([...mine].sort());
    expect(icon()).toBeInTheDocument();
  });
});
