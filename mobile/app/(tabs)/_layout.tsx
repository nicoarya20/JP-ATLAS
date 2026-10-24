import { Tabs } from 'expo-router/js-tabs';

import { GlassTabBar } from '@/components/tab-bar/glass-tab-bar';
import { MORE_ID, TABS } from '@/navigation/tabs.config';

/**
 * Bottom tabs, each its own Stack (app/(tabs)/<tab>/_layout.tsx), under the app's own tab bar (docs/phase1-navigation.md
 * §4.1). Leaving a tab pops it back to its root, as the prototype's tab jump resets that tab's history.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, popToTopOnBlur: true }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.route}
          options={{ title: tab.label }}
          listeners={
            tab.id === MORE_ID
              ? {
                  // More opens a panel instead of a screen.
                  // TODO(F1d): unfold the More panel here (docs/phase1-navigation.md §2.5); until then the tap does nothing.
                  tabPress: (e) => e.preventDefault(),
                }
              : undefined
          }
        />
      ))}
    </Tabs>
  );
}
