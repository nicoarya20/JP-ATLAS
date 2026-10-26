// Inbox ② Latest updates (prototype inbox.updates.jsx): the server's day buckets, each row unread
// until it is read. "Mark all as read" is a write (POST /api/app/inbox/read-all), so it reports both
// outcomes instead of just clearing dots locally.
import { router } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { isApiError } from '@/api/errors';
import { SectionLabel } from '@/components/form/section-label';
import { Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { UpdateGroup, UpdateRow } from '@/data/inbox';
import { markAllNewsRead, markCardRead } from '@/data/inbox.api';

import { INBOX, UPDATE_DAY, UPDATES } from './inbox.strings';
import { Lead } from './inbox-card';

/** The message a failed write came with (the server's own words), or a short fallback. */
const why = (failure: unknown, fallback: string): string =>
  isApiError(failure) ? failure.message : fallback;

/** One update: who, the sentence and its line; the time, View and the unread dot on the right. */
function Update({ u, onView }: { u: UpdateRow; onView: (u: UpdateRow) => void }) {
  return (
    <HStack className="items-start gap-3 px-4 py-3">
      <Lead lead={u.lead} />
      <VStack className="min-w-0 flex-1 gap-1">
        <Text className="text-subhead">{u.title}</Text>
        <Text className="text-footnote text-muted-foreground">{u.meta}</Text>
      </VStack>
      <VStack className="shrink-0 items-end gap-1">
        <Text className="text-footnote text-muted-foreground">{u.time}</Text>
        <Button
          size="sm"
          variant="ghost"
          accessibilityLabel={`${UPDATES.view}: ${u.title}`}
          onPress={() => onView(u)}
        >
          <ButtonText>{UPDATES.view}</ButtonText>
        </Button>
        {u.unread && (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={UPDATES.unread}
            className="h-2.5 w-2.5 rounded-full bg-atlas"
          />
        )}
      </VStack>
    </HStack>
  );
}

/** "Mark all as read", off with the reason once nothing is unread, busy while the write is out. */
function MarkAll({
  unread,
  busy,
  onPress,
}: {
  unread: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <HStack className="items-center gap-2">
      {!unread && (
        <Text testID="all-read" className="text-footnote text-muted-foreground">
          {UPDATES.allRead}
        </Text>
      )}
      <Button
        size="sm"
        variant="link"
        isDisabled={!unread || busy}
        accessibilityState={{ busy, disabled: !unread || busy }}
        onPress={onPress}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{UPDATES.markAll}</ButtonText>
      </Button>
    </HStack>
  );
}

type UpdatesTabProps = {
  groups: readonly UpdateGroup[];
  /** The server has more news than the page that was loaded. */
  more?: boolean;
};

/** The day buckets that have rows; "Mark all as read" sits next to the first one. */
export function UpdatesTab({ groups, more = false }: UpdatesTabProps) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const days = groups.filter((g) => g.rows.length);
  const unread = days.some((d) => d.rows.some((u) => u.unread));

  const readAll = async () => {
    setBusy(true);
    try {
      await markAllNewsRead();
      notice(UPDATES.marked);
    } catch (failure) {
      notice(why(failure, UPDATES.markFailed));
    } finally {
      setBusy(false);
    }
  };

  // The row opens its item either way; marking it read is a separate write, so its failure is said
  // out loud instead of leaving a dot that quietly came back.
  const openRow = async (u: UpdateRow) => {
    router.push(u.href);
    if (!u.unread) return;
    try {
      await markCardRead(u.key);
    } catch (failure) {
      notice(why(failure, UPDATES.readFailed));
    }
  };

  if (!days.length) {
    return (
      <EmptyState
        testID="updates-empty"
        icon={Inbox}
        title={UPDATES.empty}
        text={UPDATES.emptyText}
      />
    );
  }
  return (
    <>
      {days.map((d, i) => (
        <VStack key={d.key} className="gap-2">
          <HStack className="min-h-11 items-center justify-between">
            <SectionLabel>{UPDATE_DAY[d.key]}</SectionLabel>
            {i === 0 && <MarkAll unread={unread} busy={busy} onPress={() => void readAll()} />}
          </HStack>
          <Rows>
            {d.rows.map((u) => (
              <Update key={u.key} u={u} onView={(row) => void openRow(row)} />
            ))}
          </Rows>
        </VStack>
      ))}
      {more && (
        <Text testID="inbox-more-updates" className="text-footnote text-muted-foreground">
          {INBOX.moreUpdates}
        </Text>
      )}
    </>
  );
}
