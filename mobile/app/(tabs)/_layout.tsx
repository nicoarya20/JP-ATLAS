import { NativeTabs } from 'expo-router/native-tabs';

/**
 * Bottom tabs, same order and labels as the prototype tab bar (riset-keano/prototype-react/src/kit/layout.jsx).
 * Icons: SF Symbols on iOS, Material Symbols on Android, closest to the prototype's lucide icons.
 * More is a plain screen for now; the prototype's fold-out More panel comes in Phase 1.
 */
const TABS = [
  { name: 'index', label: 'Home', icon: { sf: 'house', md: 'home' } },
  { name: 'tasks', label: 'Tasks', icon: { sf: 'checkmark.circle', md: 'check_circle' } },
  { name: 'projects', label: 'Projects', icon: { sf: 'folder', md: 'folder' } },
  { name: 'events', label: 'Events', icon: { sf: 'calendar', md: 'calendar_month' } },
  { name: 'more', label: 'More', icon: { sf: 'ellipsis', md: 'more_horiz' } },
] as const;

export default function TabsLayout() {
  return (
    <NativeTabs>
      {TABS.map(({ name, label, icon }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={icon.sf} md={icon.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
