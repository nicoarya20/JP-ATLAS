// Profile hero (prototype profile.main.jsx Hero): photo, name and role line. The prototype's note bubble and presence
// dot are gone: the server keeps neither (GAP P-1, P-2), and a note or "Online" only this phone knows would be a claim
// no teammate ever sees.
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProfileData } from '@/data/profile';

/** Top of the profile. */
export function ProfileHero({ d }: { d: ProfileData }) {
  return (
    <VStack className="gap-3">
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
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-page font-bold">
          {d.full}
        </Text>
        {d.line ? <Text className="text-body text-muted-foreground">{d.line}</Text> : null}
      </VStack>
    </VStack>
  );
}
