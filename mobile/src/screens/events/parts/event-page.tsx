// Frame of a pushed or modal events screen (prototype Screen back + ev-has-foot): the detail header, the scrolling
// content, and an optional footer pinned above the home indicator. No tab bar: events/[id]/* and the form hide it.
import { CalendarX } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailHeader } from '@/components/screen/detail-header';
import { EmptyState } from '@/components/state/empty-state';
import { SPACING } from '@/theme/tokens';

import { DETAIL } from '../events.strings';

type EventPageProps = {
  title: string;
  /** Opened as a modal route (the New event / Edit form). */
  modal?: boolean;
  /** Right side of the header (the ⋯ menu). */
  right?: ReactNode;
  /** Action bar pinned to the bottom. */
  foot?: ReactNode;
  children: ReactNode;
  testID?: string;
};

/** Header, content and footer; the content keeps clear of the keyboard and the footer. */
export function EventPage({ title, modal, right, foot, children, testID }: EventPageProps) {
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
      {foot && (
        <View
          className="gap-2 border-t border-border bg-card px-4 pt-3"
          style={{ paddingBottom: bottom }}
        >
          {foot}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** An event id that is not in the store (an old link): say so instead of showing another event. */
export function EventMissing() {
  return (
    <EventPage title={DETAIL.title} testID="event-missing">
      <EmptyState icon={CalendarX} title={DETAIL.missingTitle} text={DETAIL.missingText} />
    </EventPage>
  );
}
