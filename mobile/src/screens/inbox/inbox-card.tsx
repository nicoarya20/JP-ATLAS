// Inbox response card (prototype inbox.parts.jsx Who + Card): who it is about, the server's sentence
// and the line under it, the body, and its one action button.
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { View } from 'react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { InboxLead, RespondCard } from '@/data/inbox';

import { INBOX } from './inbox.strings';

/** The person's avatar (their real photo once PersonAvatar takes one), or the system's mark. */
export function Lead({ lead }: { lead: InboxLead }) {
  if (lead.kind === 'person') return <PersonAvatar name={lead.name || '?'} />;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={INBOX.system}
      className="h-10 w-10 items-center justify-center rounded-full bg-muted"
    >
      <Icon as={Bell} size="lg" className="text-muted-foreground" />
    </View>
  );
}

const BODY = {
  bold: 'text-body font-semibold',
  quote: 'border-l-2 border-border pl-3 text-subhead',
} as const;

/**
 * One card of "Needs your response"; the action opens the task, event or screen it is about. A card
 * the server sent no button for keeps its link through the card itself and shows no button.
 */
export function InboxCard({ card }: { card: RespondCard }) {
  return (
    <SectionCard testID={`inbox-card-${card.key}`}>
      <HStack className="items-start gap-3">
        <Lead lead={card.lead} />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text className="text-subhead">{card.title}</Text>
          <Text className="text-footnote text-muted-foreground">{card.meta}</Text>
        </VStack>
      </HStack>
      {card.body && (
        <VStack className="gap-1">
          <Text className={BODY[card.body.tone]}>{card.body.text}</Text>
        </VStack>
      )}
      {card.action && (
        <HStack className="justify-end">
          <Button
            size="sm"
            variant="outline"
            accessibilityLabel={`${card.action}: ${card.title}`}
            onPress={() => router.push(card.href)}
          >
            <ButtonText>{card.action}</ButtonText>
          </Button>
        </HStack>
      )}
    </SectionCard>
  );
}
