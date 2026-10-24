// Profile ① (prototype profile.main.jsx), a full-height modal from the More panel's profile card: hero, Edit profile,
// shortcut rows, general info, Sign out (T2). Rows leading to a tab close the modal first.
import * as Clipboard from 'expo-clipboard';
import { type Href, router } from 'expo-router';
import {
  BellOff,
  CalendarDays,
  CircleHelp,
  Copy,
  Inbox,
  ListChecks,
  Pencil,
  Settings,
} from 'lucide-react-native';
import { useState } from 'react';

import { SectionLabel } from '@/components/form/section-label';
import { Row, Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { VStack } from '@/components/ui/vstack';
import { getProfile } from '@/data/profile';
import { setProfile, useProfile } from '@/data/profile.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { SignOutDialog } from '../auth/sign-out';
import { EDIT_FROM_PROFILE } from '../settings/profile-edit.screen';
import { PROFILE as P } from './profile.strings';
import { Tile } from './profile.tiles';
import { PresenceDot, ProfileHero } from './profile-hero';

/** Close the profile modal, then open `href` in the tabs under it. */
function leaveTo(href: Href) {
  router.dismiss();
  router.navigate(href);
}

/** The profile modal. role: who is signed in (K12). */
export function ProfileScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const notice = useNotice();
  const { online, muted } = useProfile();
  const d = getProfile(role);
  const [signingOut, setSigningOut] = useState(false);
  const copyEmail = () =>
    Clipboard.setStringAsync(d.me.email).then(
      (ok) => notice(ok ? P.copied : P.copyFailed(P.clipboardRefused)),
      (e: unknown) => notice(P.copyFailed(e instanceof Error ? e.message : String(e))),
    );
  return (
    <DetailPage testID="screen-profile" title="" modal>
      <ProfileHero d={d} online={online} />
      <Button size="lg" onPress={() => leaveTo(EDIT_FROM_PROFILE)}>
        <ButtonIcon as={Pencil} />
        <ButtonText>{P.editProfile}</ButtonText>
      </Button>
      <Rows>
        <Row
          lead={<Tile icon={ListChecks} tone="blue" />}
          title={P.myTasks}
          onPress={() => leaveTo('/tasks')}
        />
        <Row
          lead={<Tile icon={CalendarDays} tone="red" />}
          title={P.myCalendar}
          onPress={() => router.push('/profile/calendar')}
        />
        <Row
          lead={<Tile icon={Inbox} tone="blue" />}
          title={P.inbox}
          accessibilityLabel={`${P.inbox}, ${d.inbox}`}
          right={
            <Badge variant="info">
              <BadgeText>{String(d.inbox)}</BadgeText>
            </Badge>
          }
          onPress={() => leaveTo('/more/inbox')}
        />
        <Row
          lead={<Tile icon={BellOff} tone="indigo" />}
          title={P.mute}
          right={
            <Switch
              accessibilityLabel={P.mute}
              value={muted}
              onValueChange={(v) => setProfile({ muted: v })}
            />
          }
        />
        <Row
          lead={<Tile icon={Settings} />}
          title={P.settings}
          onPress={() => leaveTo('/more/settings')}
        />
        <Row
          lead={<Tile icon={CircleHelp} />}
          title={P.help}
          onPress={() => notice(P.helpNotice)}
        />
      </Rows>
      <VStack className="gap-2">
        <SectionLabel>{P.general}</SectionLabel>
        <Rows>
          <Row
            lead={<PresenceDot online={online} small />}
            title={P.showOnline}
            sub={P.seenAs(online)}
            right={
              <Switch
                accessibilityLabel={P.showOnline}
                value={online}
                onValueChange={(v) => setProfile({ online: v })}
              />
            }
          />
          <Row
            title={d.me.email}
            sub={P.email}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={P.copyEmail}
                onPress={() => void copyEmail()}
                className="h-11 w-11 items-center justify-center rounded-full data-[active=true]:bg-muted"
              >
                <Icon as={Copy} size="lg" className="text-atlas" />
              </Pressable>
            }
          />
        </Rows>
      </VStack>
      <Button size="lg" variant="destructive" onPress={() => setSigningOut(true)}>
        <ButtonText>{P.signOut}</ButtonText>
      </Button>
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </DetailPage>
  );
}
