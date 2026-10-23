// Team, Archive and Home rows open the item they show: the tapped person, the archived item to delete, and Home's
// focus tasks, next event and projects, all read from the live data.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetEvents } from '../screens/events/events.store';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

afterEach(() => { resetEvents(); resetTasks(); });

const tapRow = text => fireEvent.click(dom.getByText(text).closest('[role="button"]'));
const section = name => within(dom.getByText(name).closest('.card'));

describe('items open by id', () => {
  it('Team opens the tapped person with their own tasks', () => {
    renderApp('team.list', 'pm');
    fireEvent.click(dom.getByText('Dodi Hartono').closest('button'));
    expect(dom.getByText('Leave planned Oct 12–14')).toBeInTheDocument();
    for (const t of D.tasks.filter(x => x.who === 'Dodi' && x.status !== 'Done')) expect(dom.getByText(`#${t.no} ${t.title}`)).toBeInTheDocument();
    expect(dom.queryByText('#12 Fix SSO login')).not.toBeInTheDocument();
  });

  it('Archive · Delete forever names the item it was opened from', () => {
    renderApp('archive.list', 'admin');
    const row = dom.getByText('#21 Duplicate login test').closest('li, [role="button"], .row, div');
    fireEvent.click(within(row.parentElement).getAllByRole('button', { name: 'Delete forever' })[0]);
    expect(dom.getByText('Task “#21 Duplicate login test” will be gone for good. This cannot be undone.')).toBeInTheDocument();
  });

  it('Home focus groups my open tasks; Done marks a task done and a reviewed task shows its status', () => {
    renderApp('home.main', 'pm');
    const focus = section('My Focus');
    expect(focus.getAllByText(/^(Overdue|Today|This week|Awaiting your review)$/).map(n => n.textContent))
      .toEqual(['Overdue', 'Today', 'This week', 'Awaiting your review']);
    expect(focus.getByText('#12 Fix SSO login').closest('[role="button"]')).toHaveTextContent('In progress');
    expect(focus.getByText('#17 Fix the save button on the profile page')).toBeInTheDocument();
    fireEvent.click(within(focus.getByText('#14 Write the API spec').closest('[role="button"]')).getByRole('button', { name: 'Done' }));
    expect(D.task(14).status).toBe('Done');
    expect(focus.queryByText('#14 Write the API spec')).not.toBeInTheDocument();
  });

  it('Home focus rows, the next event and project rows open those items', () => {
    renderApp('home.main', 'pm');
    tapRow('Onboarding design review');
    expect(dom.getByText('Event detail')).toBeInTheDocument();
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(section('Agenda & Projects').queryByText('Company Profile Website')).not.toBeInTheDocument();   // done
    tapRow('PT Sinar Client Portal');
    expect(dom.queryByText('My Focus')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#projects.overview');
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    tapRow('#14 Write the API spec');
    expect(dom.getAllByText('Write the API spec').length).toBeGreaterThan(0);
    expect(dom.queryByText('My Focus')).not.toBeInTheDocument();
  });
});
