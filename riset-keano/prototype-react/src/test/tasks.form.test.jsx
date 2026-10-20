// Tasks ⑥ New task · Fill form: every control is live; Assignee takes several people; Save adds a To do task (one per
// save) and opens its detail, where every assignee shows and each of them finds it under My tasks.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const people = () => within(dom.getByRole('group', { name: 'Assignee' }));
const chip = name => people().getByRole('button', { name });
const save = () => fireEvent.click(dom.getByRole('button', { name: 'Save' }));
const fact = k => dom.getByText(k, { selector: 'dt' }).nextElementSibling;
const last = () => D.tasks[D.tasks.length - 1];

// Unmount first: resetTasks drops the added task, and a still-mounted detail would re-render without it.
afterEach(() => { cleanup(); resetTasks(); });

describe('new task · fill form', () => {
  it('names the field Assignee and offers the project members, the draft person picked', () => {
    renderApp('tasks.form', 'pm');
    expect(dom.queryByText('Who works on it')).not.toBeInTheDocument();
    expect(dom.getByText('Assignee')).toBeInTheDocument();
    expect(people().getAllByRole('button').map(b => b.textContent)).toEqual(['Nico Pratama', 'Rina Wulandari', 'Dodi Hartono', 'Sri Rahayu']);
    expect(chip('Rina Wulandari')).toHaveAttribute('aria-pressed', 'true');
  });

  it('creates a task with several assignees and opens its detail', () => {
    renderApp('tasks.form', 'pm');
    const count = D.tasks.length;
    fireEvent.change(dom.getByLabelText('Title *'), { target: { value: 'Ship the login fix' } });
    fireEvent.click(chip('Dodi Hartono'));
    fireEvent.click(chip('Sri Rahayu'));
    save();
    expect(D.tasks).toHaveLength(count + 1);
    expect(last()).toMatchObject({ title: 'Ship the login fix', status: 'To do', who: 'Rina', also: ['Dodi', 'Sri'], project: 'Atlas Project' });
    expect(dom.getByText('Task created')).toBeInTheDocument();
    expect(dom.getByRole('heading', { name: 'Ship the login fix' })).toBeInTheDocument();
    for (const n of ['Rina Wulandari', 'Dodi Hartono', 'Sri Rahayu']) expect(fact('Assignee')).toHaveTextContent(n);
    expect(dom.getByText(`${D.me().name} created this task`)).toBeInTheDocument();
  });

  it('puts the task under My tasks of every assignee', () => {
    renderApp('tasks.form', 'pm');
    fireEvent.change(dom.getByLabelText('Title *'), { target: { value: 'Pair on the login fix' } });
    fireEvent.click(chip('Dodi Hartono'));
    save();
    cleanup();
    renderApp('tasks.my', 'member');
    expect(dom.getByText('Pair on the login fix')).toBeInTheDocument();
  });

  it('saves priority, due date, type, phase, description, start, hours and tags', () => {
    renderApp('tasks.form', 'pm');
    fireEvent.click(dom.getByRole('button', { name: 'Critical' }));
    fireEvent.change(dom.getByLabelText('Due date'), { target: { value: '2026-10-22' } });
    fireEvent.change(dom.getByRole('combobox', { name: 'Type' }), { target: { value: 'Improvement' } });
    fireEvent.change(dom.getByRole('combobox', { name: 'Phase' }), { target: { value: 'Testing' } });
    fireEvent.change(dom.getByLabelText('Description'), { target: { value: 'Fix it on phones.' } });
    fireEvent.change(dom.getByLabelText('Start date'), { target: { value: '2026-10-21' } });
    fireEvent.change(dom.getByLabelText('Estimated hours'), { target: { value: '6' } });
    const tag = dom.getByRole('textbox', { name: 'Add tag' });
    fireEvent.change(tag, { target: { value: 'Mobile' } });
    fireEvent.keyDown(tag, { key: 'Enter' });
    save();
    expect(last()).toMatchObject({ priority: 'Critical', due: 'Oct 22', type: 'Improvement', tags: ['login', 'mobile'] });
    expect(D.taskDetail[last().no]).toMatchObject({ phase: 'Testing', desc: 'Fix it on phones.', start: 'Oct 21', hours: '6' });
    expect(fact('Priority')).toHaveTextContent('Critical');
    expect(dom.getByText('Fix it on phones.')).toBeInTheDocument();
  });

  it('keeps Save off without a title or without an assignee', () => {
    renderApp('tasks.form', 'pm');
    fireEvent.click(chip('Rina Wulandari'));
    expect(dom.getByText('Pick at least one person.')).toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(chip('Nico Pratama'));
    expect(dom.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.change(dom.getByLabelText('Title *'), { target: { value: ' ' } });
    expect(dom.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('switching project keeps only its members and drops the phase outside Atlas', () => {
    renderApp('tasks.form', 'pm');
    fireEvent.click(chip('Nico Pratama'));
    fireEvent.change(dom.getByRole('combobox', { name: 'Project' }), { target: { value: 'sinar' } });
    expect(people().getAllByRole('button').map(b => b.textContent)).toEqual(['Rina Wulandari', 'Nico Pratama', 'Lea Santoso']);
    expect(chip('Rina Wulandari')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Nico Pratama')).toHaveAttribute('aria-pressed', 'true');
    expect(dom.queryByRole('combobox', { name: 'Phase' })).not.toBeInTheDocument();
    fireEvent.change(dom.getByRole('combobox', { name: 'Project' }), { target: { value: 'tools' } });
    expect(people().getAllByRole('button').map(b => b.textContent)).toEqual(['Nico Pratama', 'Dodi Hartono']);
    expect(chip('Nico Pratama')).toHaveAttribute('aria-pressed', 'true');
    save();
    expect(last()).toMatchObject({ project: 'Internal Tools', who: 'Nico' });
    expect(last().also).toEqual([]);
  });

  it('offers a Member only their own projects', () => {
    renderApp('tasks.form', 'member');
    const options = [...dom.getByRole('combobox', { name: 'Project' }).options].map(o => o.value);
    expect(options).toEqual(D.projects.filter(p => p.members.includes(D.me().name)).map(p => p.id));
  });

  it('hides and shows the extra fields', () => {
    renderApp('tasks.form', 'pm');
    const toggle = dom.getByRole('button', { name: 'Show less' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(dom.queryByLabelText('Description')).not.toBeInTheDocument();
    fireEvent.click(dom.getByRole('button', { name: 'Show more' }));
    expect(dom.getByLabelText('Description')).toBeInTheDocument();
  });

  it('turns review on with a reviewer who is not an assignee', () => {
    renderApp('tasks.form', 'pm');
    fireEvent.click(dom.getByRole('switch', { name: 'Needs review' }));
    const pick = dom.getByRole('combobox', { name: 'Reviewer' });
    expect([...pick.options].map(o => o.value)).toEqual(['Nico', 'Ayu']);
    fireEvent.change(pick, { target: { value: 'Ayu' } });
    save();
    expect(fact('Reviewer')).toHaveTextContent('Ayu (Admin)');
    expect(dom.queryByRole('button', { name: 'Mark done' })).not.toBeInTheDocument();
  });
});
