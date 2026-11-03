// Profile hero (prototype profile.main.jsx Hero): photo with the status note beside it (GAP P-1, kept by the server),
// name and role line. The prototype's presence dot is gone: the server keeps no presence (GAP P-2), and an "Online"
// only this phone knows would be a claim no teammate ever sees.
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProfileData } from '@/data/profile';

import { ProfileNote } from './profile-note';

/** Top of the profile. */
export function ProfileHero({ d }: { d: ProfileData }) {
  return (
    <VStack className="gap-3">
      <HStack className="items-center gap-3">
        {/* Decorative: the name under it is what screen readers read. */}
        <Avatar
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="h-20 w-20 bg-accent"
        >
          <AvatarFallbackText className="text-page font-semibold text-accent-foreground">
            {d.full}
          </AvatarFallbackText>
          {d.image ? <AvatarImage testID="profile-photo" source={{ uri: d.image }} /> : null}
        </Avatar>
        {d.note !== undefined ? <ProfileNote note={d.note} /> : null}
      </HStack>
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-page font-bold">
          {d.full}
        </Text>
        {d.line ? <Text className="text-body text-muted-foreground">{d.line}</Text> : null}
      </VStack>
    </VStack>
  );
}
