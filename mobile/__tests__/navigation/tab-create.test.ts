import type { Role } from '../../src/data/sample/people';
import { CREATE, CREATE_MENU, createFor } from '../../src/navigation/tab-create';
import { createOptions } from '../../src/screens/create/create.options';
import { CAPS } from '../helpers/whoami-fixtures';

// Port of the createFor cases in the prototype's src/test/tabbar.test.jsx, on the server's caps instead of a role.
describe('createFor', () => {
  it('creates a project on Projects and an event on Events', () => {
    expect(createFor('projects', CAPS.pm)).toEqual(CREATE.projects);
    expect(createFor('projects', CAPS.admin)?.go).toBe('projects.new');
    expect(createFor('events', CAPS.member)).toEqual(CREATE.events);
    expect(createFor('tasks', CAPS.member)?.go).toBe('tasks.write');
  });

  it('falls back to the Create sheet on Home and More', () => {
    expect(createFor('home', CAPS.pm)?.go).toBe('home.create');
    expect(createFor('more', CAPS.admin)?.go).toBe('home.create');
    expect(createFor('home', CAPS.member)).toEqual(CREATE_MENU);
  });

  it('has no "+" where the caps don\'t allow the tab\'s item', () => {
    expect(createFor('projects', CAPS.member)).toBeNull();
    expect(createFor('events', { ...CAPS.pm, createEvent: false })).toBeNull();
  });

  it('has no "+" at all before the caps are in', () => {
    for (const tab of ['home', 'tasks', 'projects', 'events', 'more'] as const) {
      expect(createFor(tab, null)).toBeNull();
    }
  });

  it.each<Role>(['member', 'pm', 'admin'])('names each "+" for screen readers (%s)', (role) => {
    expect(createFor('tasks', CAPS[role])?.label).toBe('New task');
    expect(createFor('events', CAPS[role])?.label).toBe('New event');
    expect(createFor('home', CAPS[role])?.label).toBe('Create');
  });
});

describe('createOptions', () => {
  const titles = (caps: Parameters<typeof createOptions>[0]) =>
    createOptions(caps).map((o) => o.title);

  it('offers what the caps allow; import stays hidden (no server route)', () => {
    expect(titles(CAPS.pm)).toEqual(['Task', 'Project', 'Event']);
    expect(titles(CAPS.member)).toEqual(['Task', 'Event']);
  });

  it('offers nothing before the caps are in', () => {
    expect(titles(null)).toEqual([]);
  });
});
