// Inbox ② Latest updates (prototype inbox.updates.jsx): the server's news cards under Today, Yesterday and Older, each
// unread until opened, marked read, or "Mark all as read".
import { Bell } from 'lucide-react-native';
import { useState } from 'react';

import { SectionLabel } from '@/components/form/section-label';
import { Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { InboxCard } from '@/data/inbox';
import { markAllInboxRead, markInboxRead } from '@/data/inbox.api';
import { Lane, useOpenCard, why } from './inbox.lane';
import { UPDATES, UPDATES_EMPTY } from './inbox.strings';
import { metaLine, UnreadDot, Who } from './inbox-card';

/** A button that runs `run` with its spinner on, and reports a failure in the server's words. */
function useBusy() {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const go = async (run: () => Promise<string | null>) => {
    setBusy(true);
    try {
      const done = await run();
      if (done) notice(done);
    } catch (e) {
      notice(why(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, go };
}

/** "Mark as read" on an unread card the app cannot open (no screen for it). */
function MarkRead({ card }: { card: InboxCard }) {
  const { busy, go } = useBusy();
  return (
    <Button
      size="sm"
      variant="ghost"
      isDisabled={busy}
      accessibilityState={{ busy, disabled: busy }}
      accessibilityLabel={`${UPDATES.markRead}: ${card.sentence}`}
      onPress={() => go(() => markInboxRead(card.id, card.lane).then(() => null))}
    >
      {busy && <ButtonSpinner />}
      <ButtonText>{UPDATES.markRead}</ButtonText>
    </Button>
  );
}

/** One update: who, the sentence and what it is about; its button and the unread dot on the right. */
function Update({ card }: { card: InboxCard }) {
  const openCard = useOpenCard();
  const { open } = card;
  return (
    <HStack testID={`inbox-update-${card.id}`} className="items-start gap-3 px-4 py-3">
      <Who card={card} size="sm" />
      <VStack className="min-w-0 flex-1 gap-1">
        <Text className="text-subhead">{card.sentence}</Text>
        <Text className="text-footnote text-muted-foreground">{metaLine(card)}</Text>
        {card.excerpt && (
          <Text className="text-footnote text-muted-foreground">{card.excerpt}</Text>
        )}
      </VStack>
      <VStack className="shrink-0 items-end gap-1">
        {!card.read && <UnreadDot />}
        {open ? (
          <Button
            size="sm"
            variant="ghost"
            accessibilityLabel={`${open.label}: ${card.sentence}`}
            onPress={() => openCard(card, open.href)}
          >
            <ButtonText>{open.label}</ButtonText>
          </Button>
        ) : (
          !card.read && <MarkRead card={card} />
        )}
      </VStack>
    </HStack>
  );
}

/**
 * "Mark all as read", off with the reason once nothing is unread. `unread` is the server's count
 * when it is in, else whether a loaded card is unread.
 */
function MarkAll({ unread }: { unread: boolean }) {
  const { busy, go } = useBusy();
  const off = !unread || busy;
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
        isDisabled={off}
        accessibilityState={{ busy, disabled: off }}
        onPress={() => go(async () => UPDATES.marked((await markAllInboxRead()).updated))}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{UPDATES.markAll}</ButtonText>
      </Button>
    </HStack>
  );
}

/** The news lane by day; "Mark all as read" sits on the first heading. */
export function UpdatesTab({ infoUnread }: { infoUnread: number | null }) {
  return (
    <Lane lane="info">
      {({ cards, days }) => {
        if (!cards.length) {
          return (
            <EmptyState
              testID="updates-empty"
              icon={Bell}
              title={UPDATES_EMPTY.title}
              text={UPDATES_EMPTY.text}
            />
          );
        }
        const unread = infoUnread === null ? cards.some((c) => !c.read) : infoUnread > 0;
        return days.map((d, i) => (
          <VStack key={d.group} className="gap-2">
            <HStack className="min-h-11 flex-wrap items-center justify-between">
              <SectionLabel>{d.label}</SectionLabel>
              {i === 0 && <MarkAll unread={unread} />}
            </HStack>
            <Rows>
              {d.cards.map((c) => (
                <Update key={c.id} card={c} />
              ))}
            </Rows>
          </VStack>
        ));
      }}
    </Lane>
  );
}
