import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import type { TabDef } from '@/navigation/tabs.config';

type GlassPillProps = {
  tabs: readonly TabDef[];
  /** Index of the selected tab. */
  active: number;
  onPick: (index: number) => void;
};

/**
 * The pill of icon tabs (prototype kit/tabbar.jsx GlassTabs, plain for now): the selected icon in the accent colour,
 * labels for screen readers only. The bubble, drag and glass arrive in F1b and F1e (docs/phase1-navigation.md §6.6).
 */
export function GlassPill({ tabs, active, onPick }: GlassPillProps) {
  return (
    // A plain View, not accessible itself: VoiceOver would otherwise read the pill as one element and skip its tabs.
    <View
      testID="tab-bar"
      accessibilityRole="tablist"
      accessibilityLabel="App navigation"
      className="h-[58px] flex-1 flex-row rounded-full border border-border bg-card p-1"
    >
      {tabs.map((tab, i) => {
        const selected = i === active;
        return (
          <Pressable
            key={tab.id}
            testID={`tab-${tab.id}`}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onPick(i)}
            className="flex-1 items-center justify-center rounded-full"
          >
            {/* 22 px like the prototype's TAB_ICON (the gluestack Icon types no numeric size) */}
            <Icon
              as={tab.Icon}
              className={`h-[22px] w-[22px] ${selected ? 'text-atlas' : 'text-foreground'}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
