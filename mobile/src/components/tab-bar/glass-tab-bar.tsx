import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { SESSION_ROLE } from '@/data/session';
import { createFor } from '@/navigation/tab-create';
import { MORE_ID, tabOfRoute } from '@/navigation/tabs.config';
import { MORE_PANEL } from '@/screens/more/more.tiles';
import { MorePanel } from '@/screens/more/more-panel';

import { CreateFab } from './create-fab';
import { GlassPill } from './glass-pill';
import { useMore } from './more-panel.context';
import { TabShell } from './tab-panel';
import { TabScrim } from './tab-scrim';
import { useKeyboardShown } from './use-keyboard-shown';
import { useTabBarVisible } from './use-tab-bar-visible';

/** Gap between the bar and the screen edges (prototype --sp-4). */
const EDGE = 16;

/**
 * The app's bottom tab bar, given to the expo-router Tabs as `tabBar`: drawn once over every tab screen so it outlives
 * screen changes (prototype PhoneApp host, kit/layout.jsx AppTabBar). Floats over the content; screens leave room with
 * useTabBarInset(). A tab emits `tabPress` like the stock bar, so a tab's listener can take it over. More has no
 * screen: it unfolds the More panel over a dimmed screen, and More again, the dim, another tab or any navigation folds
 * it (docs/phase1-navigation.md §2.5; its state lives in MorePanelProvider). Beside the pill, the "+" creates what the
 * active tab holds, for the role. The keyboard hides the bar.
 */
export function GlassTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const visible = useTabBarVisible();
  const more = useMore();
  // Typing: the keyboard covers the bar's place, so it steps aside (tabBarHideOnKeyboard only serves the stock bar).
  const typing = useKeyboardShown();
  if (!visible || typing) return null;

  const tabs = state.routes.map((route) => {
    const tab = tabOfRoute(route.name);
    if (!tab)
      throw new Error(
        `Tab route "${route.name}" is missing from TABS (src/navigation/tabs.config.ts)`,
      );
    return tab;
  });
  const moreIndex = tabs.findIndex((tab) => tab.id === MORE_ID);

  /** Pick tab `index`; true when it is the active tab afterwards (the bubble goes back otherwise). */
  const pick = (index: number) => {
    if (index === moreIndex) {
      more.toggle();
      return true;
    }
    // The tab under the panel: only fold.
    if (more.open && index === state.index) {
      more.close();
      return true;
    }
    const route = state.routes[index];
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) {
      more.close();
      return false;
    }
    // Another tab folds the panel through the new pathname (useMorePanel), in the same render as the tab change.
    // Folding here first rendered the tab under the panel for a moment, and the bubble went there before the new tab.
    if (index !== state.index) navigateToTab(route.key);
    return true;
  };

  return (
    // While the panel is open, VoiceOver stays in here: the bar, the panel and the dim (which names the way out).
    <View
      pointerEvents="box-none"
      accessibilityViewIsModal={more.open}
      style={StyleSheet.absoluteFill}
    >
      <TabScrim open={more.open} onClose={more.close} />
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: EDGE, right: EDGE, bottom: EDGE + insets.bottom }}
        className="flex-row items-end"
      >
        <TabShell
          open={more.open}
          label={MORE_PANEL.label}
          onEscape={more.close}
          panel={<MorePanel close={more.close} />}
        >
          <GlassPill tabs={tabs} active={more.open ? moreIndex : state.index} onPick={pick} />
        </TabShell>
        <CreateFab
          target={createFor(tabs[state.index].id, SESSION_ROLE)}
          onOpen={more.close}
          panelOpen={more.open}
        />
      </View>
    </View>
  );
}
