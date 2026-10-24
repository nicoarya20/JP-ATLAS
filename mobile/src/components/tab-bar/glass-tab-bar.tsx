import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { tabOfRoute } from '@/navigation/tabs.config';

import { GlassPill } from './glass-pill';
import { useTabBarVisible } from './use-tab-bar-visible';

/** Gap between the bar and the screen edges (prototype --sp-4). */
const EDGE = 16;

/**
 * The app's bottom tab bar, given to the expo-router Tabs as `tabBar`: drawn once over every tab screen so it outlives
 * screen changes (prototype PhoneApp host). Floats over the content; screens leave room with useTabBarInset().
 * A tap emits `tabPress` like the stock bar, so a tab's listener can take it over (More).
 */
export function GlassTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const visible = useTabBarVisible();
  if (!visible) return null;

  const tabs = state.routes.map((route) => {
    const tab = tabOfRoute(route.name);
    if (!tab)
      throw new Error(
        `Tab route "${route.name}" is missing from TABS (src/navigation/tabs.config.ts)`,
      );
    return tab;
  });

  const pick = (index: number) => {
    const route = state.routes[index];
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) navigateToTab(route.key);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: EDGE, right: EDGE, bottom: EDGE + insets.bottom }}
      className="flex-row items-end"
    >
      <GlassPill tabs={tabs} active={state.index} onPick={pick} />
    </View>
  );
}
