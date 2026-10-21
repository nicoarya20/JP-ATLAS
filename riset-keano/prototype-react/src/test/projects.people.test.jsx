// Projects ① people row: the list shows every project by default; My projects or one teammate's avatar narrows it
// (one pick at a time, tap again or Clear for all), together with Filter & sort, and Back from a project keeps it.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { renderApp } from './render';

const row = () => within(dom.getByRole('group', { name: 'Show projects of' }));
const pick = name => fireEvent.click(row().getByRole('button', { name }));
/** Visible label of a chip (its avatar initial is hidden from the name). */
const label = b => b.querySelector('.react-cupertino-ui-suggestion-chip__label').textContent;
const pressed = name => row().getByRole('button', { name }).getAttribute('aria-pressed');
/** Project names the cards show, in D order (order is covered by projects.filter.test). */
const shown = () => D.projects.map(p => p.name).filter(n => dom.queryByText(n));
const withPerson = (name, list = D.projects) => list.filter(p => p.members.includes(name)).map(p => p.name);

describe('projects people row', () => {
  it('drops the My / All switch and shows every project, with the row under the search', () => {
    renderApp('projects.list', 'pm');
    expect(dom.queryByRole('tab', { name: 'All projects' })).not.toBeInTheDocument();
    expect(dom.queryByRole('tab', { name: 'My projects' })).not.toBeInTheDocument();
    expect(shown()).toHaveLength(D.projects.length);
    const search = document.querySelector('.search-filter'), group = dom.getByRole('group', { name: 'Show projects of' });
    expect(search.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lists My projects, then every teammate in a project but not me, by first name', () => {
    renderApp('projects.list', 'pm');   // Nico; Ayu (Admin) is in no project
    expect(row().getAllByRole('button').map(label))
      .toEqual(['My projects', 'Rina', 'Dodi', 'Sri', 'Lea']);
  });

  it('My projects shows only mine, says how many, and a second tap shows every project again', () => {
    renderApp('projects.list', 'pm');
    pick('My projects');
    expect(shown()).toEqual(withPerson('Nico'));
    expect(pressed('My projects')).toBe('true');
    expect(dom.getByText(`My projects · ${withPerson('Nico').length}`)).toBeInTheDocument();
    pick('My projects');
    expect(shown()).toHaveLength(D.projects.length);
    expect(dom.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it("a teammate's avatar shows their projects, one pick at a time, and Clear shows every project", () => {
    renderApp('projects.list', 'pm');
    pick('Rina');
    expect(shown()).toEqual(withPerson('Rina'));
    expect(dom.getByText(`Rina's projects · ${withPerson('Rina').length}`)).toBeInTheDocument();
    pick('Dodi');
    expect(shown()).toEqual(withPerson('Dodi'));
    expect(pressed('Rina')).toBe('false');
    expect(pressed('Dodi')).toBe('true');
    fireEvent.click(dom.getByRole('button', { name: 'Clear' }));
    expect(shown()).toHaveLength(D.projects.length);
    expect(pressed('Dodi')).toBe('false');
  });

  it('works together with Filter & sort and keeps the pick after Apply', () => {
    renderApp('projects.list', 'pm');
    pick('Rina');
    fireEvent.click(dom.getByRole('button', { name: 'Filter and sort' }));
    const sheet = within(dom.getByRole('dialog'));
    const status = within(sheet.getByRole('heading', { name: 'Status', level: 3 }).closest('.field'));
    fireEvent.click(status.getByRole('button', { name: 'Done' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Apply' }));
    expect(shown()).toEqual(['Company Profile Website']);
    expect(pressed('Rina')).toBe('true');
  });

  it('keeps the pick after opening a project and going back', () => {
    renderApp('projects.list', 'pm');
    pick('Lea');
    fireEvent.click(dom.getByText('PT Sinar Client Portal'));
    expect(window.location.hash).toBe('#projects.overview');
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(pressed('Lea')).toBe('true');
    expect(shown()).toEqual(withPerson('Lea'));
  });

  it('gives a Member no My projects (theirs are all of them) and only projects shared with a teammate', () => {
    renderApp('projects.list', 'member');   // Dodi
    const mine = D.projects.filter(p => p.members.includes('Dodi'));
    expect(row().queryByRole('button', { name: 'My projects' })).not.toBeInTheDocument();
    expect(row().getAllByRole('button').map(label)).toEqual(['Nico', 'Rina', 'Sri']);
    pick('Sri');
    expect(shown()).toEqual(withPerson('Sri', mine));
    expect(dom.getByText(`Projects with Sri · ${withPerson('Sri', mine).length}`)).toBeInTheDocument();
  });

  it('tells an Admin in no project that My projects is empty', () => {
    renderApp('projects.list', 'admin');   // Ayu
    pick('My projects');
    expect(shown()).toEqual([]);
    expect(dom.getByRole('heading', { name: "You're not in any project yet." })).toBeInTheDocument();
  });
});
