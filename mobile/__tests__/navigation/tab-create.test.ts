import type { Role } from '../../src/data/sample/people';
import { CREATE, CREATE_MENU, createFor } from '../../src/navigation/tab-create';

// Port of the createFor cases in the prototype's src/test/tabbar.test.jsx.
describe('createFor', () => {
  it('creates a project on Projects and an event on Events', () => {
    expect(createFor('projects', 'pm')).toEqual(CREATE.projects);
    expect(createFor('projects', 'admin')?.go).toBe('projects.new');
    expect(createFor('events', 'member')).toEqual(CREATE.events);
    expect(createFor('tasks', 'member')?.go).toBe('tasks.write');
  });

  it('falls back to the Create sheet on Home and More', () => {
    expect(createFor('home', 'pm')?.go).toBe('home.create');
    expect(createFor('more', 'admin')?.go).toBe('home.create');
    expect(createFor('home', 'member')).toEqual(CREATE_MENU);
  });

  it('has no "+" where the role cannot create the tab\'s item (Member on Projects)', () => {
    expect(createFor('projects', 'member')).toBeNull();
  });

  it.each<Role>(['member', 'pm', 'admin'])('names each "+" for screen readers (%s)', (role) => {
    expect(createFor('tasks', role)?.label).toBe('New task');
    expect(createFor('events', role)?.label).toBe('New event');
    expect(createFor('home', role)?.label).toBe('Create');
  });
});
