import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import type { TabDef } from '@/navigation/tabs.config';

import { TabBubble } from './tab-bubble';
import { TabItem } from './tab-item';
import { useBubble } from './use-bubble';

type GlassPillProps = {
  tabs: readonly TabDef[];
  /** Index of the selected tab. */
  active: number;
  /** Pick tab `index`; false when it did not become the active tab (its press was taken over, e.g. More). */
  onPick: (index: number) => boolean;
};

/**
 * The pill of icon tabs (prototype kit/tabbar.jsx GlassTabs): a bubble behind the lit tab that a finger drags across
 * the tabs, labels for screen readers only (docs/phase1-navigation.md §2.3–2.4). Its surface is the shell around it
 * (TabShell), which the More panel unfolds out of.
 */
export function GlassPill({ tabs, active, onPick }: GlassPillProps) {
  const bubble = useBubble({
    n: tabs.length,
    active,
    onRelease: (index) => {
      if (!onPick(index) && index !== active) bubble.snapBack();
    },
  });

  return (
    <GestureDetector gesture={bubble.pan}>
      {/* A plain View, not accessible itself: VoiceOver would otherwise read the pill as one element and skip its tabs. */}
      <View
        testID="tab-bar"
        accessibilityRole="tablist"
        accessibilityLabel="App navigation"
        onLayout={(e) => bubble.onWidth(e.nativeEvent.layout.width)}
        className="h-[58px] flex-row p-1"
      >
        <TabBubble n={tabs.length} values={bubble.values} />
        {tabs.map((tab, i) => (
          <TabItem
            key={tab.id}
            tab={tab}
            index={i}
            selected={i === active}
            lit={i === bubble.litTab}
            values={bubble.values}
            onActivate={() => bubble.release(i)}
            onStep={(step) => bubble.release((active + step + tabs.length) % tabs.length)}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
