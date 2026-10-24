// Inbox ② Latest updates (prototype inbox.updates.jsx): Today (unread until "Mark all as read") and Yesterday.
import { router } from 'expo-router';
import { View } from 'react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SectionLabel } from '@/components/form/section-label';
import { Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { UpdateDay, UpdateRow } from '@/data/inbox';
import { markAllRead } from '@/data/inbox.store';
import { routeHref } from '@/navigation/route-href';

import { UPDATES } from './inbox.strings';

/** One update: avatar, title and meta; the time, View and the unread dot on the right. */
function Update({ u }: { u: UpdateRow }) {
  return (
    <HStack className="items-start gap-3 px-4 py-3">
      <PersonAvatar name={u.actor || '?'} size="sm" />
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
          onPress={() => router.push(routeHref(u.href))}
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

/** Both days; "Mark all as read" sits next to Today. */
export function UpdatesTab({ days }: { days: readonly UpdateDay[] }) {
  const notice = useNotice();
  const readAll = () => {
    markAllRead();
    notice(UPDATES.marked);
  };
  return days.map((d) => (
    <VStack key={d.day} className="gap-2">
      <HStack className="min-h-11 items-center justify-between">
        <SectionLabel>{d.day}</SectionLabel>
        {d.day === 'Today' && (
          <Button size="sm" variant="link" onPress={readAll}>
            <ButtonText>{UPDATES.markAll}</ButtonText>
          </Button>
        )}
      </HStack>
      <Rows>
        {d.rows.map((u) => (
          <Update key={u.title} u={u} />
        ))}
      </Rows>
    </VStack>
  ));
}
