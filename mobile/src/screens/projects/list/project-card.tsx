// Project card of the list (prototype projects.list.jsx ProjectCard): name and status, Lead, health, progress and the
// due date. Tap opens the project.
//
// The members' avatar stack and the "4 members" it was read as are gone: `ProjectListItem` carries no members and
// asking the team endpoint once per card would be a request per row (GAP A-1). Listed in
// docs/phase2-gap-disembunyikan.md.
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProjectCard as Card } from '@/data/projects';

import { Bar } from '../parts/display';
import { LIST } from '../projects.strings';
import { ADDED } from '../projects.strings.added';

/** "Atlas, Active, Lead: Nico, On track, Progress 70%, Due Oct 31": what the card shows, read once. */
const spoken = (c: Card) =>
  [c.name, c.status, LIST.lead(c.lead), c.health, ADDED.progress(c.percent), LIST.due(c.due)].join(
    ', ',
  );

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
        <Text className="text-subhead text-muted-foreground">{LIST.due(card.due)}</Text>
      </VStack>
    </Pressable>
  );
}
