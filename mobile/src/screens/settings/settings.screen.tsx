// Settings ① (prototype settings.main.jsx): my account, notifications, leave, Admin-only team settings, Sign out (T2).
import { router } from 'expo-router';
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SectionLabel } from '@/components/form/section-label';
import { SwitchRow } from '@/components/form/switch-row';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getSettings, type SettingsData } from '@/data/settings';

import { SignOutDialog } from '../auth/sign-out';
import { SETTINGS as S } from './settings.strings';
import { Group, Setting, TeamSettings } from './team-settings';

function Account({ d }: { d: SettingsData }) {
  return (
    <VStack className="gap-2">
      <SectionLabel>{S.account}</SectionLabel>
      <SectionCard>
        <HStack className="items-center gap-3">
          <PersonAvatar name={d.me.full} size="lg" />
          <VStack className="min-w-0 flex-1 gap-1">
            <Text className="text-headline font-semibold">{d.me.full}</Text>
            <Text className="text-footnote text-muted-foreground">{d.line}</Text>
            <Text className="text-footnote text-muted-foreground">{d.me.email}</Text>
          </VStack>
        </HStack>
        <Button variant="outline" onPress={() => router.push('/more/settings/profile')}>
          <ButtonText>{S.editProfile}</ButtonText>
        </Button>
      </SectionCard>
    </VStack>
  );
}

/** Settings. role: who is signed in (K12). */
export function SettingsScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const d = getSettings(role);
  const [reminders, setReminders] = useState(true);
  const [updates, setUpdates] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  return (
    <DetailPage testID="screen-settings" title={S.title}>
      <Account d={d} />
      <Group label={S.notifications} note={S.notificationsNote}>
        <SwitchRow
          label={S.reminders}
          sub={S.remindersHint}
          value={reminders}
          onChange={setReminders}
        />
        <SwitchRow
          label={S.inboxUpdates}
          sub={S.inboxUpdatesHint}
          value={updates}
          onChange={setUpdates}
        />
      </Group>
      <Group label={S.availability}>
        <Setting title={S.leave} hint={S.leaveHint}>
          <Button size="sm" variant="outline" onPress={() => router.push('/leave')}>
            <ButtonText>{d.leaveAction}</ButtonText>
          </Button>
        </Setting>
      </Group>
      {d.team && <TeamSettings />}
      <Button size="lg" variant="destructive" onPress={() => setSigningOut(true)}>
        <ButtonText>{S.signOut}</ButtonText>
      </Button>
      <Text className="text-center text-footnote text-muted-foreground">{d.footer}</Text>
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </DetailPage>
  );
}
