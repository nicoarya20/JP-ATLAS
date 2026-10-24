// Frame of a pushed or modal screen (prototype Screen with back): the detail header, the scrolling content, and an
// optional footer pinned above the home indicator. A screen that keeps the tab bar leaves room for it at the bottom.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/navigation/use-tab-bar-inset';
import { SPACING } from '@/theme/tokens';

import { DetailHeader } from './detail-header';

type DetailPageProps = {
  title: string;
  /** Opened as a modal route: down chevron "Cancel". */
  modal?: boolean;
  /** No chevron (a root screen such as the pending sign-up). */
  back?: boolean;
  /** Right side of the header. */
  right?: ReactNode;
  /** Action bar pinned to the bottom. */
  foot?: ReactNode;
  /** The tab bar shows over this screen (docs/phase1-navigation.md §2.6). */
  tabBar?: boolean;
  children: ReactNode;
  testID?: string;
};

/** Header, content and footer; the content keeps clear of the keyboard, the footer and the tab bar. */
export function DetailPage(p: DetailPageProps) {
  const safe = useSafeAreaInsets().bottom + SPACING.md;
  const bar = useTabBarInset() + SPACING.md;
  const bottom = p.tabBar ? bar : safe;
  return (
    <KeyboardAvoidingView
      testID={p.testID}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <DetailHeader title={p.title} modal={p.modal} back={p.back} right={p.right} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-4 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: p.foot ? SPACING.md : bottom }}
        className="flex-1"
      >
        {p.children}
      </ScrollView>
      {p.foot && (
        <View
          className="flex-row gap-2 border-t border-border bg-card px-4 pt-3"
          style={{ paddingBottom: safe }}
        >
          {p.foot}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Card holding a group of content (prototype kit Section). */
export function SectionCard({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="gap-3 rounded-card bg-card p-4">
      {children}
    </View>
  );
}
