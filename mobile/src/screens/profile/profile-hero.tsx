// Profile hero: photo, name, and the job / department / account-role line, all from the server.
//
// The prototype's note bubble and presence dot are gone. The server keeps neither a profile note
// nor any presence (GAP A-21, A-22), so the bubble could only ever have been a note to myself on
// one phone, and "Teammates see you as Online" would have been a claim about other people's
// screens that nothing backs.
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProfileData } from '@/data/profile';

/** Top of the profile. */
export function ProfileHero({ d }: { d: ProfileData }) {
  return (
    <HStack className="items-center gap-3">
      <PersonAvatar name={d.me.full} size="xl" />
      <VStack className="min-w-0 flex-1 gap-1">
        <Text accessibilityRole="header" className="text-page font-bold">
          {d.me.full}
        </Text>
        {!!d.line && <Text className="text-body text-muted-foreground">{d.line}</Text>}
      </VStack>
    </HStack>
  );
}
