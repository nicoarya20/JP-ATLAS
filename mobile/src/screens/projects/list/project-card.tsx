// Project card of the list (prototype projects.list.jsx ProjectCard): name and status, Lead, health, progress, due date
// and the members' avatars. Tap opens the project.
import { AvatarStack } from '@/components/avatar/avatar-stack';
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProjectCard as Card } from '@/data/projects';

import { Bar } from '../parts/display';
import { LIST } from '../projects.strings';
import { ADDED } from '../projects.strings.added';

/** "Atlas, Active, Lead: Nico, On track, Progress 70%, Due Oct 31, 4 members": what the card shows, read once. */
const spoken = (c: Card) =>
  [
    c.name,
    c.status,
    LIST.lead(c.lead),
    c.health,
    ADDED.progress(c.percent),
    LIST.due(c.due),
    ADDED.members(c.members.length),
  ].join(', ');

/** One project; onOpen gets its id. */
export function ProjectCard({ card, onOpen }: { card: Card; onOpen: (id: string) => void }) {
  return (
    <Pressable
      testID={`project-card-${card.id}`}
      accessibilityRole="button"
      accessibilityLabel={spoken(card)}
      onPress={() => onOpen(card.id)}
      className="gap-3 rounded-card bg-card p-4 data-[active=true]:bg-muted"
    >
      <HStack className="items-start justify-between gap-2">
        <Text className="flex-1 text-headline font-semibold">{card.name}</Text>
        <StatusPill status={card.status} />
      </HStack>
      <VStack className="gap-2">
        <Text className="text-subhead text-muted-foreground">{LIST.lead(card.lead)}</Text>
        <Text className="text-subhead font-semibold">{card.health}</Text>
        <Bar value={card.progress} label={LIST.progress(card.name)} percent={card.percent} />
        <HStack className="items-center justify-between gap-2">
          <Text className="text-subhead text-muted-foreground">{LIST.due(card.due)}</Text>
          <AvatarStack names={card.members} />
        </HStack>
      </VStack>
    </Pressable>
  );
}
