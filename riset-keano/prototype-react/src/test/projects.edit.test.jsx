// Projects ⑬ Edit project and ⑭ Move to Archive from the detail ⋯ (Manager & Admin): the edit saves into the project
// (a rename carries over to its tasks), and Archive takes the project with its tasks away until Undo.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetProjects } from '../screens/projects/projects.store';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const btn = name => dom.getByRole('button', { name });
const atlasTasks = () => D.tasks.filter(t => t.project === 'Atlas Project').length;

/** Open the Atlas detail ⋯ as `role` and pick a menu item. */
function pick(item, role = 'pm') {
  renderApp('projects.overview', role);
  fireEvent.click(btn('Project actions'));
  fireEvent.click(within(dom.getByRole('menu')).getByRole('menuitem', { name: item }));
}

afterEach(() => { resetTasks(); resetProjects(); });

describe('Edit project', () => {
  it('opens prefilled from the detail ⋯', () => {
    pick('Edit project');
    expect(window.location.hash).toBe('#projects.edit');
    expect(dom.getByLabelText('Project name *')).toHaveValue('Atlas Project');
    expect(btn('Active')).toHaveAttribute('aria-pressed', 'true');
    expect(dom.getByLabelText('Deadline')).toHaveValue('2026-10-31');
  });

  it('saves name, status and deadline, renames the tasks and logs the edit', () => {
    const tasks = atlasTasks();
    pick('Edit project');
    fireEvent.change(dom.getByLabelText('Project name *'), { target: { value: 'Atlas Platform' } });
    fireEvent.click(btn('On hold'));
    fireEvent.change(dom.getByLabelText('Deadline'), { target: { value: '2026-11-14' } });
    fireEvent.click(btn('Save changes'));
    expect(D.project('atlas')).toMatchObject({ name: 'Atlas Platform', status: 'On hold', due: 'Nov 14', dueLong: 'Nov 14, 2026' });
    expect(D.tasks.filter(t => t.project === 'Atlas Platform')).toHaveLength(tasks);
    expect(D.atlas.activity[0][0]).toBe('Nico edited the project');
    expect(window.location.hash).toBe('#projects.overview');
    expect(dom.getByText('Project updated')).toBeInTheDocument();
  });

  it('cannot save without a name', () => {
    pick('Edit project');
    fireEvent.change(dom.getByLabelText('Project name *'), { target: { value: '  ' } });
    expect(btn('Save changes')).toBeDisabled();
  });
});

describe('Move project to Archive', () => {
  it('asks first and names how many tasks go along', () => {
    pick('Move to Archive');
    expect(dom.getByText('Move project to Archive?')).toBeInTheDocument();
    expect(dom.getByText(`“Atlas Project” and its ${atlasTasks()} tasks leave every list and wait in Archive.`)).toBeInTheDocument();
    fireEvent.click(btn('Cancel'));
    expect(D.project('atlas')).toBe(D.projects.find(p => p.id === 'atlas'));
  });

  it('takes the project and its tasks to Archive and lands on the list with Undo', () => {
    const tasks = atlasTasks();
    pick('Move to Archive');
    fireEvent.click(btn('Move to Archive'));
    expect(D.projects.some(p => p.id === 'atlas')).toBe(false);
    expect(atlasTasks()).toBe(0);
    expect(D.archive[0]).toMatchObject({ kind: 'PROJECT', title: 'Atlas Project', by: 'Nico', includes: `${tasks} tasks`, project: 'atlas' });
    expect(window.location.hash).toBe('#archive.undo');
    expect(dom.getByText('Project moved to Archive')).toBeInTheDocument();
  });

  it('Undo puts the project and its tasks back where they were', () => {
    const projects = D.projects.map(p => p.id), tasks = D.tasks.map(t => t.no);
    pick('Move to Archive');
    fireEvent.click(btn('Move to Archive'));
    fireEvent.click(btn('Undo'));
    expect(D.projects.map(p => p.id)).toEqual(projects);
    expect(D.tasks.map(t => t.no)).toEqual(tasks);
    expect(D.archive.some(a => a.project === 'atlas')).toBe(false);
    expect(window.location.hash).toBe('#projects.list');
    expect(dom.getByText('Project restored')).toBeInTheDocument();
  });

  it('a Member gets no ⋯ on the project', () => {
    renderApp('projects.overview', 'member');
    expect(dom.queryByRole('button', { name: 'Project actions' })).not.toBeInTheDocument();
  });
});
