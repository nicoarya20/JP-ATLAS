// Frame of a pushed or modal Tasks screen (prototype tasks.parts.jsx FootScreen): the detail header, the scrolling
// content, and an optional foot bar pinned under it (Foot). No tab bar: tasks/[id]/* and the modals hide it.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailHeader } from '@/components/screen/detail-header';
import { SPACING } from '@/theme/tokens';

type TaskPageProps = {
  title: string;
  /** Opened as a modal route (New task). */
  modal?: boolean;
  /** Right side of the header (the ⋯ menu). */
  right?: ReactNode;
  /** Foot bar (a Foot) pinned under the content. */
  foot?: ReactNode;
  children: ReactNode;
  testID?: string;
};

/** Header, content and foot; the content keeps clear of the keyboard. */
export function TaskPage({ title, modal, right, foot, children, testID }: TaskPageProps) {
  const bottom = useSafeAreaInsets().bottom + SPACING.md;
  return (
    <KeyboardAvoidingView
      testID={testID}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <DetailHeader title={title} modal={modal} right={right} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-4 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: foot ? SPACING.md : bottom }}
        className="flex-1"
      >
        {children}
      </ScrollView>
      {foot}
    </KeyboardAvoidingView>
  );
}
