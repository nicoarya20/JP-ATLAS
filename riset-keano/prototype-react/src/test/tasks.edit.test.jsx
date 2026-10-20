// Tasks ⑧b Edit task: the detail ⋯ (label colour, not the accent) opens Edit task / Cancel task; Edit task changes
// every field the detail shows and Save writes them back, so the detail and the lists show the new values.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const dots = () => dom.getByRole('button', { name: 'Task actions' });
const menu = () => { fireEvent.click(dots()); return within(dom.getByRole('menu')); };
const openEdit = () => fireEvent.click(menu().getByRole('menuitem', { name: 'Edit task' }));
const save = () => fireEvent.click(dom.getByRole('button', { name: 'Save' }));
const fact = k => dom.getByText(k, { selector: 'dt' }).nextElementSibling;

/** Start on the detail screen of task #no (opened from My tasks / All tasks like a user would). */
function detail(no, role = 'pm') {
  renderApp('tasks.all', role);
  fireEvent.click(dom.getByText(D.task(no).title));
  expect(dom.getByRole('heading', { name: D.task(no).title })).toBeInTheDocument();
}

afterEach(resetTasks);

describe('task detail ⋯ menu', () => {
  it('is a plain ⋯ icon button that opens Edit task and Cancel task', () => {
    detail(14);
    expect(dots()).toHaveClass('menu-btn');
    expect(dots()).toHaveAttribute('aria-expanded', 'false');
    const m = menu();
    expect(m.getAllByRole('menuitem').map(b => b.textContent)).toEqual(['Edit task', 'Cancel task']);
    fireEvent.click(m.getByRole('menuitem', { name: 'Cancel task' }));
    expect(within(dom.getByRole('dialog')).getByText(`#14 ${D.task(14).title}`)).toBeInTheDocument();
  });

  it('closes when tapping outside', () => {
    detail(14);
    menu();
    fireEvent.click(dom.getByRole('button', { name: 'Close menu' }));
    expect(dom.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('gives a Member Edit task but not Cancel task on a To do task', () => {
    detail(16, 'member');
    expect(menu().getAllByRole('menuitem').map(b => b.textContent)).toEqual(['Edit task']);
  });
});

describe('edit task', () => {
  it('opens prefilled with the task', () => {
    detail(12);
    openEdit();
    expect(dom.getByText('Edit task')).toBeInTheDocument();
    expect(dom.getByLabelText('Title *')).toHaveValue('Fix SSO login');
    expect(dom.getByRole('combobox', { name: 'Assignee' })).toHaveValue('Nico');
    expect(dom.getByLabelText('Due date')).toHaveValue('2026-10-05');
    expect(dom.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    expect(dom.getByRole('combobox', { name: 'Type' })).toHaveValue('Bug');
    expect(dom.getByRole('combobox', { name: 'Phase' })).toHaveValue('Development');
    expect(dom.getByRole('button', { name: 'Remove tag sso' })).toBeInTheDocument();
    expect(dom.getByLabelText('Description')).toHaveValue(D.taskDetail[12].desc);
    expect(dom.getAllByRole('textbox', { name: /^Step \d$/ })).toHaveLength(3);
    expect(dom.getByLabelText('Caption for login-screenshot.png')).toBeInTheDocument();
  });

  it('saves every field and the detail shows them', () => {
    detail(14);
    openEdit();
    fireEvent.change(dom.getByLabelText('Title *'), { target: { value: 'Write the API spec v2' } });
    fireEvent.change(dom.getByRole('combobox', { name: 'Assignee' }), { target: { value: 'Rina' } });
    fireEvent.change(dom.getByLabelText('Due date'), { target: { value: '2026-10-12' } });
    fireEvent.click(dom.getByRole('button', { name: 'Critical' }));
    fireEvent.change(dom.getByRole('combobox', { name: 'Type' }), { target: { value: 'Improvement' } });
    fireEvent.change(dom.getByRole('combobox', { name: 'Phase' }), { target: { value: 'Testing' } });
    fireEvent.click(dom.getByRole('button', { name: 'Remove tag api' }));
    const tag = dom.getByRole('textbox', { name: 'Add tag' });
    fireEvent.change(tag, { target: { value: 'Docs' } });
    fireEvent.keyDown(tag, { key: 'Enter' });
    fireEvent.change(dom.getByLabelText('Description'), { target: { value: 'Spec for the v2 endpoints.' } });
    fireEvent.click(dom.getByRole('button', { name: '+ Add step' }));
    fireEvent.change(dom.getByRole('textbox', { name: 'Step 1' }), { target: { value: 'List the endpoints' } });
    fireEvent.click(dom.getByRole('button', { name: '+ Attach evidence' }));
    fireEvent.change(dom.getByLabelText('Caption for photo-1.jpg'), { target: { value: 'Draft outline' } });
    save();

    expect(dom.getByText('Task updated')).toBeInTheDocument();
    expect(dom.getByRole('heading', { name: 'Write the API spec v2' })).toBeInTheDocument();
    expect(dom.getByText(/#14 · Atlas Project · Improvement · Testing/)).toBeInTheDocument();
    expect(fact('Assignee')).toHaveTextContent('Rina Wulandari');
    expect(fact('Due date')).toHaveTextContent('Oct 12');
    expect(fact('Priority')).toHaveTextContent('Critical');
    expect(fact('Type')).toHaveTextContent('Improvement');
    expect(fact('Tag')).toHaveTextContent('docs');
    expect(fact('Tag')).not.toHaveTextContent('api');
    expect(dom.getByText('Spec for the v2 endpoints.')).toBeInTheDocument();
    expect(dom.getByRole('heading', { name: 'Steps 0/1' })).toBeInTheDocument();
    expect(dom.getByText(`${D.me().name} edited this task`)).toBeInTheDocument();
    expect(D.task(14)).toMatchObject({ who: 'Rina', due: 'Oct 12', when: 'Due Oct 12', priority: 'Critical', tags: ['docs'] });
    expect(D.taskDetail[14].proof).toEqual([['photo-1.jpg', 'Draft outline']]);
  });

  it('turns review on with a reviewer; the To do detail then only offers Start working', () => {
    detail(14);
    openEdit();
    fireEvent.click(dom.getByRole('switch', { name: 'Needs review' }));
    const pick = dom.getByRole('combobox', { name: 'Reviewer' });
    expect([...pick.options].map(o => o.value)).toEqual(['Ayu']);   // Nico is the assignee, Lea is not on Atlas
    save();
    expect(fact('Needs review')).toHaveTextContent('Yes · Request review before Done');
    expect(fact('Reviewer')).toHaveTextContent('Ayu (Admin)');
    expect(dom.queryByRole('button', { name: 'Mark done' })).not.toBeInTheDocument();
  });

  it('keeps review locked on while the task is in review', () => {
    detail(17);
    openEdit();
    expect(dom.queryByRole('switch', { name: 'Needs review' })).not.toBeInTheDocument();
    expect(dom.getByText('Locked while the task is in review.')).toBeInTheDocument();
    save();
    expect(fact('Reviewer')).toHaveTextContent('Nico (creator, Manager)');
  });

  it('lets a Member turn review on but not choose the reviewer', () => {
    detail(16, 'member');
    openEdit();
    fireEvent.click(dom.getByRole('switch', { name: 'Needs review' }));
    expect(dom.queryByRole('combobox', { name: 'Reviewer' })).not.toBeInTheDocument();
    expect(dom.getByText('A Manager or Admin of the project reviews it.')).toBeInTheDocument();
    save();
    expect(fact('Reviewer')).toHaveTextContent('Nico (Manager)');
  });

  it('does not save an empty title, and Cancel leaves the task as it was', () => {
    detail(14);
    openEdit();
    fireEvent.change(dom.getByLabelText('Title *'), { target: { value: '  ' } });
    expect(dom.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(dom.getByRole('button', { name: 'Cancel' }));
    expect(dom.getByRole('heading', { name: 'Write the API spec' })).toBeInTheDocument();
  });

  it('shows the edit on the task list too', () => {
    detail(15);
    openEdit();
    fireEvent.change(dom.getByLabelText('Title *'), { target: { value: 'Review the new onboarding design' } });
    save();
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(dom.getByText('Review the new onboarding design')).toBeInTheDocument();
  });
});
