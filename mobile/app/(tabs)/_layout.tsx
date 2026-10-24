import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { SnackHost } from '@/components/snack/snack-host';
import { GlassTabBar } from '@/components/tab-bar/glass-tab-bar';
import { BehindMorePanel, MorePanelProvider } from '@/components/tab-bar/more-panel.context';
import { TABS } from '@/navigation/tabs.config';

/**
 * Bottom tabs, each its own Stack (app/(tabs)/<tab>/_layout.tsx), under the app's own tab bar (docs/phase1-navigation.md
 * §4.1). More has no screen of its own: the bar unfolds the More panel instead (GlassTabBar; open state in
 * MorePanelProvider, which also hides the tab screens from TalkBack while it is open), and its screens
 * (app/(tabs)/more/*) keep More selected. Leaving a tab pops it back to its root, as the prototype's tab jump resets
 * that tab's history. The snack host comes after the tabs so a snack draws over the bar's row; it keeps clear of the
 * bar itself (useTabBarInset).
 */
export default function TabsLayout() {
  return (
    <MorePanelProvider>
      <View className="flex-1">
        <Tabs
          tabBar={(props) => <GlassTabBar {...props} />}
          screenOptions={{ headerShown: false, popToTopOnBlur: true }}
          screenLayout={({ children }) => <BehindMorePanel>{children}</BehindMorePanel>}
        >
          {TABS.map((tab) => (
            <Tabs.Screen key={tab.id} name={tab.route} options={{ title: tab.label }} />
          ))}
        </Tabs>
        <SnackHost />
      </View>
    </MorePanelProvider>
  );
}
