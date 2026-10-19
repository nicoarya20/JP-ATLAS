// Floating glass tab bar: icon tabs keep their names for screen readers, switch screens, and "+" creates what the tab is about.
import { describe, expect, it } from 'vitest';
import { screen as dom, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { CREATE, TABS, createFor } from '../kit';
import { renderApp } from './render';

describe('glass tab bar', () => {
  it('names every icon tab and marks the active one', () => {
    renderApp('home.main', 'member');
    const tabs = dom.getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(TABS.map(t => t.label));
    expect(dom.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches screens from a tab', async () => {
    renderApp('home.main', 'member');
    await userEvent.click(dom.getByRole('tab', { name: 'Tasks' }));
    expect(dom.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true');
  });

  it('gives Tasks, Projects and Events the same title-only nav bar', () => {
    for (const id of ['tasks.my', 'projects.list', 'events.list']) {
      const { unmount } = renderApp(id, 'pm');
      const bar = document.querySelector('.react-cupertino-ui-navigation-bar');
      expect(bar.querySelector('.subtitle')).toBeNull();
      unmount();
    }
  });

  it('opens New task from the round create button on Tasks', async () => {
    renderApp('tasks.my', 'member');
    await userEvent.click(dom.getByRole('button', { name: 'New task' }));
    expect(dom.queryByRole('tablist', { name: 'App navigation' })).not.toBeInTheDocument();
    expect(dom.getByRole('tab', { name: /Just write/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('creates a project on Projects and an event on Events', () => {
    expect(createFor('projects', 'pm')).toEqual(CREATE.projects);
    expect(createFor('projects', 'admin').go).toBe('projects.new');
    expect(createFor('events', 'member')).toEqual(CREATE.events);
    expect(createFor('tasks', 'member').go).toBe('tasks.write');
  });

  it('falls back to the Create sheet on Home and More', () => {
    expect(createFor('home', 'pm').go).toBe('home.create');
    expect(createFor('more', 'admin').go).toBe('home.create');
    expect(createFor('home', 'member').go).toBe('home.create');
  });

  it('has no "+" where the role cannot create the tab\'s item (Member on Projects)', () => {
    expect(createFor('projects', 'member')).toBeNull();
  });

  it('folds the "+" away for a Member on Projects and brings it back on Tasks', async () => {
    renderApp('projects.list', 'member');
    const fab = document.querySelector('.glassbar-fab');
    expect(fab).toHaveClass('is-hidden');
    expect(fab).toHaveAttribute('inert');
    expect(dom.queryByRole('button', { name: /^(Create|New project)$/ })).not.toBeInTheDocument();
    await userEvent.click(dom.getByRole('tab', { name: 'Tasks' }));
    expect(document.querySelector('.glassbar-fab')).not.toHaveClass('is-hidden');
    expect(dom.getByRole('button', { name: 'New task' })).toBeInTheDocument();
  });

  it('opens New project from "+" on Projects', async () => {
    renderApp('projects.list', 'pm');
    expect(dom.getAllByRole('button', { name: /New project/ })).toHaveLength(1); // only the "+", no button in the nav bar
    await userEvent.click(dom.getByRole('button', { name: 'New project' }));
    expect(window.location.hash).toBe('#projects.new');
  });

  it('opens New event from "+" on Events', async () => {
    renderApp('events.list', 'member');
    await userEvent.click(dom.getByRole('button', { name: 'New event' }));
    expect(window.location.hash).toBe('#events.new');
  });

  it('lets a Manager pick task, project, event, import or leave from "+" on Home', async () => {
    renderApp('home.main', 'pm');
    await userEvent.click(dom.getByRole('button', { name: 'Create' }));
    const sheet = await dom.findByRole('dialog');
    for (const name of ['Task', 'Project', 'Event', 'Import tasks', 'Request leave']) {
      expect(within(sheet).getByText(name)).toBeInTheDocument();
    }
    await userEvent.click(within(sheet).getByText('Event'));
    expect(window.location.hash).toBe('#events.new');
  });

  it('leaves Project out of the Create sheet for a Member', async () => {
    renderApp('home.main', 'member');
    await userEvent.click(dom.getByRole('button', { name: 'Create' }));
    const sheet = await dom.findByRole('dialog');
    expect(within(sheet).getByText('Task')).toBeInTheDocument();
    expect(within(sheet).queryByText('Project')).not.toBeInTheDocument();
  });
});
