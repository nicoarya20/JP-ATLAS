// Role gating (audit step 3): a Member moves, edits and cancels only their own tasks, and sees the project detail
// without the Manager tools (⋯ project settings, phase actions, + Milestone, + Phase). Managers keep all of them.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen as dom } from '@testing-library/react';
import '../screens';
import { AppProvider } from '../core/app.context';
import { setRole } from '../core/session';
import { D } from '../data/sample';
import { TasksEdit } from '../screens/tasks/tasks.edit';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const btn = name => dom.queryByRole('button', { name });

/** Open task #no from the project's Tasks tab as `role` (a Member only sees View there). */
function detail(no, role) {
  renderApp('projects.tasks', role);
  fireEvent.click(dom.getByText(D.task(no).title));
  expect(dom.getByRole('heading', { name: D.task(no).title })).toBeInTheDocument();
}

afterEach(resetTasks);

describe('task detail per role', () => {
  it("a Member gets no actions and no ⋯ on someone else's task, only who may change it", () => {
    detail(14, 'member');
    expect(btn('Start working')).not.toBeInTheDocument();
    expect(btn('Mark done')).not.toBeInTheDocument();
    expect(btn('Task actions')).not.toBeInTheDocument();
    expect(dom.getByText('Only Nico, the project Manager or an Admin can change this task.')).toBeInTheDocument();
  });

  it('a Member keeps the actions and ⋯ on their own task, and Start working moves it', () => {
    detail(16, 'member');
    expect(btn('Task actions')).toBeInTheDocument();
    fireEvent.click(btn('Start working'));
    expect(D.task(16).status).toBe('In progress');
  });

  it("a Manager keeps the actions on a Member's task", () => {
    detail(16, 'pm');
    expect(btn('Start working')).toBeInTheDocument();
    expect(btn('Task actions')).toBeInTheDocument();
  });

  it("Edit task opened on someone else's task by a Member shows no form and changes nothing", () => {
    setRole('member');
    render(<AppProvider start="tasks.edit"><TasksEdit params={{ task: 14 }} /></AppProvider>);
    expect(dom.getByText("You can't edit this task")).toBeInTheDocument();
    expect(dom.getByText('Only Nico, the project Manager or an Admin can edit #14.')).toBeInTheDocument();
    expect(btn('Save')).not.toBeInTheDocument();
    expect(dom.queryByRole('textbox', { name: 'Title *' })).not.toBeInTheDocument();
  });

  it('Edit task on their own task still shows the form for a Member', () => {
    setRole('member');
    render(<AppProvider start="tasks.edit"><TasksEdit params={{ task: 16 }} /></AppProvider>);
    expect(btn('Save')).toBeInTheDocument();
  });
});

describe('project detail per role', () => {
  it('a Member sees no ⋯ project settings, phase actions, + Milestone or + Phase', () => {
    renderApp('projects.phases', 'member');
    expect(btn('Project settings')).not.toBeInTheDocument();
    ['Complete phase', 'Start phase', '+ Phase', '+ Milestone'].forEach(name => expect(btn(name)).not.toBeInTheDocument());
    expect(dom.getAllByText('Milestone').length).toBe(D.atlas.phases.length);
  });

  it('a Manager keeps ⋯ (opening Project settings) and every phase action', () => {
    renderApp('projects.phases', 'pm');
    ['Complete phase', 'Start phase', '+ Phase'].forEach(name => expect(btn(name)).toBeInTheDocument());
    expect(dom.getAllByRole('button', { name: '+ Milestone' }).length).toBe(D.atlas.phases.length);
    fireEvent.click(btn('Project settings'));
    expect(window.location.hash).toBe('#tasks.settings');
  });
});
