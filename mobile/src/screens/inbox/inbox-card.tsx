// Inbox response card (prototype inbox.parts.jsx Who + Card): who acted, the server's sentence, what it is about, a
// quoted excerpt, and its one button.
import { View } from 'react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { InboxCard as Card } from '@/data/inbox';
import { useOpenCard } from './inbox.lane';
import { INBOX, UPDATES } from './inbox.strings';

/** The person who acted, or the app's own initials when the system did. */
export const Who = ({ card, size }: { card: Card; size?: 'sm' | 'md' }) => (
  <PersonAvatar name={card.actor?.name || INBOX.system} size={size} />
);

/** "#12 · Atlas Project · 14:05", whichever parts the card has. */
export const metaLine = (card: Card) =>
  [card.meta, card.bundle, card.time].filter(Boolean).join(' · ');

/** The dot an unread card carries, named for screen readers. */
export const UnreadDot = () => (
  <View
    accessible
    accessibilityRole="image"
    accessibilityLabel={UPDATES.unread}
    className="h-2.5 w-2.5 rounded-full bg-atlas"
  />
);

/** One card of "Needs your response"; its button opens what it is about and marks it read. */
export function InboxCard({ card }: { card: Card }) {
  const openCard = useOpenCard();
  const { open } = card;
  return (
    <SectionCard testID={`inbox-card-${card.id}`}>
      <HStack className="items-start gap-3">
        <Who card={card} />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text className="text-subhead">{card.sentence}</Text>
          <Text className="text-footnote text-muted-foreground">{metaLine(card)}</Text>
        </VStack>
        {!card.read && <UnreadDot />}
      </HStack>
      {card.excerpt && (
        <Text className="border-l-2 border-border pl-3 text-subhead">{card.excerpt}</Text>
      )}
      {open && (
        <HStack className="justify-end">
          <Button
            size="sm"
            variant="outline"
            accessibilityLabel={`${open.label}: ${card.sentence}`}
            onPress={() => openCard(card, open.href)}
          >
            <ButtonText>{open.label}</ButtonText>
          </Button>
        </HStack>
      )}
    </SectionCard>
  );
}
