// Profile hero (prototype profile.main.jsx Hero): photo with the presence dot, the note bubble, name, role line and
// Online / Offline.
import { View } from 'react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProfileData } from '@/data/profile';
import { PROFILE } from './profile.strings';
import { ProfileNote } from './profile-note';

/** Presence dot: the bright presence green when online, grey when not. Decorative; the status text says it. */
export function PresenceDot({ online, small }: { online: boolean; small?: boolean }) {
  return (
    <View
      testID={small ? 'presence-dot-small' : 'presence-dot'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`rounded-full border-2 border-card ${small ? 'h-3 w-3' : 'h-5 w-5'} ${online ? 'bg-presence' : 'bg-muted-foreground'}`}
    />
  );
}

/** Top of the profile. */
export function ProfileHero({ d, online }: { d: ProfileData; online: boolean }) {
  return (
    <VStack className="gap-3">
      <HStack className="items-center gap-3">
        <View>
          <PersonAvatar name={d.me.full} size="xl" />
          <View className="absolute bottom-0 right-0">
            <PresenceDot online={online} />
          </View>
        </View>
        <ProfileNote />
      </HStack>
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-page font-bold">
          {d.me.full}
        </Text>
        <Text className="text-body text-muted-foreground">{d.line}</Text>
        <Text className="text-footnote text-muted-foreground">
          {online ? PROFILE.online : PROFILE.offline}
        </Text>
      </VStack>
    </VStack>
  );
}
