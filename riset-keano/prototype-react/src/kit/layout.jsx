// Screen frame: navigation bar, scrolling content and the bottom tab bar. Every screen renders through <Screen>.
import { createContext, useContext, useLayoutEffect } from 'react';
import { NavigationBar } from '@react-cupertino-ui/navigation-bar';
import { CalendarDays, CircleCheck, Ellipsis, FolderKanban, House, Plus } from 'lucide-react';
import { useApp } from '../core/app.context';
import { allowed } from '../core/registry';
import { GlassTabs } from './tabbar';

const TAB_ICON = 22;
/** Bottom tabs: id -> label, target screen, icon. */
export const TABS = [
  { id: 'home', label: 'Home', go: 'home.main', icon: <House size={TAB_ICON} /> },
  { id: 'tasks', label: 'Tasks', go: 'tasks.my', icon: <CircleCheck size={TAB_ICON} /> },
  { id: 'projects', label: 'Projects', go: 'projects.list', icon: <FolderKanban size={TAB_ICON} /> },
  { id: 'events', label: 'Events', go: 'events.list', icon: <CalendarDays size={TAB_ICON} /> },
  { id: 'more', label: 'More', go: 'home.more', icon: <Ellipsis size={TAB_ICON} /> },
];

/** What the round "+" next to the tab pill creates on each tab: that tab's own "new" screen. */
export const CREATE = {
  tasks: { go: 'tasks.write', label: 'New task' },
  projects: { go: 'projects.new', label: 'New project' },
  events: { go: 'events.new', label: 'New event' },
};
/** Home, More, and a tab whose "new" screen the role can't open (Member on Projects) get the Create sheet to pick from. */
const CREATE_MENU = { go: 'home.create', label: 'Create' };
export const createFor = (tab, role) => (CREATE[tab] && allowed(CREATE[tab].go, role) ? CREATE[tab] : CREATE_MENU);

/**
 * Bottom navigation as a floating liquid-glass pill (icons only, labels kept for screen readers; a draggable bubble
 * marks the active tab, see GlassTabs) plus a round "+" create button (see createFor).
 * active = 'home' | 'tasks' | 'projects' | 'events' | 'more'. Tabs reset history (top-level jump).
 */
export function AppTabBar({ active }) {
  const { go, role } = useApp();
  const items = TABS.map(({ id, label, icon }) => ({ id, label, icon }));
  const create = createFor(active, role);
  return (
    <div className="glassbar">
      <GlassTabs className="glassbar-tabs" items={items} activeId={active}
        onChange={id => go(TABS.find(t => t.id === id).go, { replace: true })} />
      <button type="button" className="glassbar-fab" aria-label={create.label} onClick={() => go(create.go)}>
        <Plus size={TAB_ICON + 4} />
      </button>
    </div>
  );
}

/** Top bar. back = true shows the Back button (pops history). left/right = extra items. */
export function NavBar({ title = '', sub, back, left, right, large }) {
  const { back: pop } = useApp();
  return (
    <NavigationBar title={title} subtitle={sub} large={large} withBackButton={!!back} onBack={() => pop()}
      leftItems={left} rightItems={right} />
  );
}

/**
 * Where a screen's tab bar is drawn. PhoneApp provides a setter and draws one AppTabBar that outlives screen changes,
 * so the bubble slides between tabs instead of a new bar appearing per screen. Without a host, Screen draws its own.
 */
export const TabBarHost = createContext(null);

/**
 * One phone screen: nav bar (or a custom `header`), scrolling content, optional tab bar.
 * props: {title, sub, back, left, right, large, header, tab, className (extra content classes), children}.
 */
export function Screen({ title, sub, back, left, right, large, header, tab, className = '', children }) {
  const host = useContext(TabBarHost);
  // Layout effect: the host bar switches tabs in the same frame the screen appears. A leaving screen clears it, and the
  // next screen's set lands in the same commit, so the bar never unmounts between two tab screens.
  useLayoutEffect(() => {
    if (!host) return undefined;
    host(tab ?? null);
    return () => host(null);
  }, [host, tab]);
  return (
    <div className="scr">
      {header ?? <NavBar title={title} sub={sub} back={back} left={left} right={right} large={large} />}
      <main className={`content stack ${tab ? 'with-tabbar' : ''} ${className}`.trim()}>{children}</main>
      {tab && !host && <AppTabBar active={tab} />}
    </div>
  );
}
