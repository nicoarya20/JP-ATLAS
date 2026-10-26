// Frame of the project detail (prototype Screen back + tabs): the detail header, then one scroll holding the project
// header, the tabs and the tab's content. `sticky` keeps a child pinned under the nav bar while the rest scrolls (the
// Tasks tab's search and List / Kanban row, the prototype's pj-tools). The tab bar shows over this screen.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { DetailHeader } from '@/components/screen/detail-header';
import { useTabBarInset } from '@/navigation/use-tab-bar-inset';
import { SPACING } from '@/theme/tokens';

type ProjectPageProps = {
  title: string;
  right?: ReactNode;
  /** Index of the child that sticks to the top while scrolling. */
  sticky?: number;
  children: ReactNode;
  testID?: string;
};

/** Header and the scrolling content, clear of the tab bar. */
export function ProjectPage({ title, right, sticky, children, testID }: ProjectPageProps) {
  const bottom = useTabBarInset() + SPACING.md;
  return (
    <View testID={testID} className="flex-1 bg-background">
      <DetailHeader title={title} right={right} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={sticky === undefined ? undefined : [sticky]}
        contentContainerClassName="gap-4 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: bottom }}
        className="flex-1"
      >
        {children}
      </ScrollView>
    </View>
  );
}
