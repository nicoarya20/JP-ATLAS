// Settings ① (prototype settings.main.jsx): my account, the two notification switches, Sign out (T2). The account is
// the server's (`GET /api/app/profile` + whoami); the Admin-only "Team settings" group is gone, as `/api/app` has none
// of its settings (GAP S-1).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { SectionLabel } from '@/components/form/section-label';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type ProfileData, useProfileData } from '@/data/profile';
import { profileResource } from '@/data/profile.api';
import { useAppCaps, whoamiResource } from '@/data/whoami.api';

import { SignOutDialog } from '../auth/sign-out';
import { SETTINGS as S } from './settings.strings';
import { Group, NotificationSwitches } from './settings-parts';

function Account({ d }: { d: ProfileData }) {
  return (
    <VStack className="gap-2">
      <SectionLabel>{S.account}</SectionLabel>
      <SectionCard>
        <HStack className="items-center gap-3">
          <Avatar
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="h-14 w-14 shrink-0 bg-accent"
          >
            <AvatarFallbackText className="text-headline font-semibold text-accent-foreground">
              {d.full}
            </AvatarFallbackText>
            {d.image ? <AvatarImage source={{ uri: d.image }} /> : null}
          </Avatar>
          <VStack className="min-w-0 flex-1 gap-1">
            <Text className="text-headline font-semibold">{d.full}</Text>
            {d.line ? <Text className="text-footnote text-muted-foreground">{d.line}</Text> : null}
            <Text className="text-footnote text-muted-foreground">{d.email}</Text>
          </VStack>
        </HStack>
        <Button variant="outline" onPress={() => router.push('/more/settings/profile')}>
          <ButtonText>{S.editProfile}</ButtonText>
        </Button>
      </SectionCard>
    </VStack>
  );
}

/** Settings. */
export function SettingsScreen() {
  const d = useProfileData();
  const caps = useAppCaps();
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    void profileResource.ensure();
    void whoamiResource.ensure();
  }, []);
  return (
    <DetailPage testID="screen-settings" title={S.title}>
      <Account d={d} />
      <Group label={S.notifications} note={S.notificationsNote}>
        <NotificationSwitches />
      </Group>
      <Button size="lg" variant="destructive" onPress={() => setSigningOut(true)}>
        <ButtonText>{S.signOut}</ButtonText>
      </Button>
      <Text className="text-center text-footnote text-muted-foreground">
        {S.footer(caps?.dashboard === true)}
      </Text>
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </DetailPage>
  );
}
