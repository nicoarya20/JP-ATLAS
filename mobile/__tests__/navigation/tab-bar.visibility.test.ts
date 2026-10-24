import { tabBarVisibleFor } from '../../src/navigation/tab-bar.visibility';

const at = (...rest: string[]) => tabBarVisibleFor(['(tabs)', ...rest]);

// docs/phase1-navigation.md §2.6: the prototype screens rendered with a `tab` prop show the bar.
describe('tabBarVisibleFor', () => {
  it.each([
    ['home', ['(home)']],
    ['home (index segment)', ['(home)', 'index']],
    ['tasks list', ['tasks']],
    ['projects list', ['projects']],
    ['project detail', ['projects', '[id]']],
    ['project detail (index segment)', ['projects', '[id]', 'index']],
    ['events list', ['events']],
    ['inbox', ['more', 'inbox']],
    ['team', ['more', 'team']],
    ['team person', ['more', 'team', '[id]']],
    ['archive', ['more', 'archive']],
    ['users', ['more', 'users']],
  ])('shows the bar on %s', (_, rest) => {
    expect(at(...rest)).toBe(true);
  });

  it.each([
    ['task detail', ['tasks', '[id]']],
    ['task edit', ['tasks', '[id]', 'edit']],
    ['task return sheet', ['tasks', '[id]', 'return']],
    ['project edit', ['projects', '[id]', 'edit']],
    ['project settings', ['projects', '[id]', 'settings']],
    ['event detail', ['events', '[id]']],
    ['event recording', ['events', '[id]', 'recording']],
    ['event outcomes', ['events', '[id]', 'outcomes', '[step]']],
    ['event cancel sheet', ['events', '[id]', 'cancel']],
    ['settings', ['more', 'settings']],
    ['settings profile', ['more', 'settings', 'profile']],
  ])('hides the bar on %s', (_, rest) => {
    expect(at(...rest)).toBe(false);
  });

  it.each([
    ['tasks filter', ['tasks', 'filter']],
    ['projects filter', ['projects', 'filter']],
    ['project extend', ['projects', '[id]', 'extend']],
    ['project archive', ['projects', '[id]', 'archive']],
    ['project task filter', ['projects', '[id]', 'task-filter']],
    ['events filter', ['events', 'filter']],
    ['archive delete', ['more', 'archive', '[key]', 'delete']],
  ])('keeps the bar under the %s sheet over a bar screen', (_, rest) => {
    expect(at(...rest)).toBe(true);
  });

  it.each([[['create']], [['tasks', 'new']], [['(auth)', 'login']], [['profile']], [[]]])(
    'leaves the choice to the screen underneath for a root route (%j)',
    (segments) => {
      expect(tabBarVisibleFor(segments)).toBeNull();
    },
  );
});
