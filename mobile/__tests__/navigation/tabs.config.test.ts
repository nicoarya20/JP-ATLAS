import { MORE_ID, TABS, tabOfRoute } from '../../src/navigation/tabs.config';

describe('TABS', () => {
  it('lists the prototype tabs in bar order, More last', () => {
    expect(TABS.map((t) => [t.id, t.label, t.root])).toEqual([
      ['home', 'Home', 'home.main'],
      ['tasks', 'Tasks', 'tasks.my'],
      ['projects', 'Projects', 'projects.list'],
      ['events', 'Events', 'events.list'],
      ['more', 'More', null],
    ]);
    expect(TABS.at(-1)?.id).toBe(MORE_ID);
  });

  it('finds a tab by its app/(tabs) route name', () => {
    expect(tabOfRoute('(home)')?.id).toBe('home');
    expect(tabOfRoute('events')?.id).toBe('events');
    expect(tabOfRoute('settings')).toBeUndefined();
  });
});
