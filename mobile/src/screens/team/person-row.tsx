// Team list row: avatar, name, the job title and projects, a recorded leave, and the task numbers
// the server allowed this viewer to see. Opens Team ② by account id.
import { router } from 'expo-router';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TeamRow } from '@/data/team';

import { rowLabel, TEAM } from './team.strings';

/**
 * A recorded leave, muted. There is no green "Available": the server sends leave or nothing, and
 * nothing does not mean available (`server/team/team.dto.ts`).
 */
export function StatusText({ status }: { status: string }) {
  if (!status) return null;
  return <Text className="text-footnote text-muted-foreground">{status}</Text>;
}

/** One person; the counts show only where the viewer may see them. Its name reads every line. */
export function PersonRow({ o }: { o: TeamRow }) {
  const name = o.you ? `${o.full} ${TEAM.you}` : o.full;
  const label = rowLabel([
    name,
    o.role,
    o.status,
    o.extra,
    o.load && TEAM.active(o.load.active),
    o.load && o.load.overdue > 0 && TEAM.overdue(o.load.overdue),
  ]);
  return (
    <Pressable
      testID={`team-row-${o.key}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(`/more/team/${o.key}`)}
      className="data-[active=true]:bg-muted"
    >
      <HStack className="items-start gap-3 px-4 py-3">
        <PersonAvatar name={o.full} />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text className="font-semibold">{name}</Text>
          {!!o.role && <Text className="text-footnote text-muted-foreground">{o.role}</Text>}
          <StatusText status={o.status} />
          {o.extra && <Text className="text-footnote text-muted-foreground">{o.extra}</Text>}
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
