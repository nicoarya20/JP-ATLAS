// Team list row (prototype team.list.jsx Person): avatar, name, job, projects, leave and task counts; opens Team ②.
import { router } from 'expo-router';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TeamRow } from '@/data/team';

import { rowLabel, TEAM } from './team.strings';

const Muted = ({ children }: { children: string }) => (
  <Text className="text-footnote text-muted-foreground">{children}</Text>
);

/** One person; every line shows only when the server sent it. Its name reads every line. */
export function PersonRow({ o }: { o: TeamRow }) {
  const name = o.you ? `${o.full} ${TEAM.you}` : o.full;
  const label = rowLabel([
    name,
    o.jobTitle,
    o.role,
    o.extra,
    o.leave,
    o.load && TEAM.active(o.load.active),
    o.load && o.load.overdue > 0 && TEAM.overdue(o.load.overdue),
  ]);
  return (
    <Pressable
      testID={`team-row-${o.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(`/more/team/${o.id}`)}
      className="data-[active=true]:bg-muted"
    >
      <HStack className="items-start gap-3 px-4 py-3">
        <PersonAvatar name={o.full} />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text className="font-semibold">{name}</Text>
          {o.jobTitle && <Muted>{o.jobTitle}</Muted>}
          <Muted>{o.role}</Muted>
          {o.extra && <Muted>{o.extra}</Muted>}
          {o.leave && <Muted>{o.leave}</Muted>}
          {o.load && (
            <HStack className="gap-2">
              <Text className="text-footnote font-semibold">{TEAM.active(o.load.active)}</Text>
              {o.load.overdue > 0 && (
                <Text className="text-footnote font-semibold text-destructive">
                  {TEAM.overdue(o.load.overdue)}
                </Text>
              )}
            </HStack>
          )}
        </VStack>
        <Text className="text-subhead text-atlas">{TEAM.view}</Text>
      </HStack>
    </Pressable>
  );
}
