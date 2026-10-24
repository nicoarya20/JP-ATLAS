// Inbox response card (prototype inbox.parts.jsx Who + Card): who it is about, the title and meta, the body, and its one
// action button.
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { InboxLead, RespondCard } from '@/data/inbox';
import { routeHref } from '@/navigation/route-href';

import { INBOX } from './inbox.strings';

/** Avatar of the person, the AI mark, or the stacked avatars of the people waiting. */
export function Lead({ lead }: { lead: InboxLead }) {
  if (lead.kind === 'people') return <AvatarStack names={lead.names} />;
  if (lead.kind === 'person') return <PersonAvatar name={lead.name || '?'} />;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={INBOX.ai}
      className="h-10 w-10 items-center justify-center rounded-full bg-accent"
    >
      <Icon as={Sparkles} size="lg" className="text-accent-foreground" />
    </View>
  );
}

const BODY = {
  bold: 'text-body font-semibold',
  muted: 'text-footnote text-muted-foreground',
  quote: 'border-l-2 border-border pl-3 text-subhead',
} as const;

/** One card of "Needs your response"; the action opens the task, event or screen it is about. */
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
      <VStack className="gap-1">
        <Text className={BODY[card.body.tone]}>{card.body.text}</Text>
        {card.why && <Text className="text-footnote text-muted-foreground">{card.why}</Text>}
      </VStack>
      <HStack className="justify-end">
        <Button
          size="sm"
          variant="outline"
          accessibilityLabel={`${card.action}: ${card.title}`}
          onPress={() => router.push(routeHref(card.href))}
        >
          <ButtonText>{card.action}</ButtonText>
        </Button>
      </HStack>
    </SectionCard>
  );
}
