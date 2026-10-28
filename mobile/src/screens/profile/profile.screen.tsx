// Profile ① (prototype profile.main.jsx), a full-height modal from the More panel's profile card: hero, Edit profile,
// shortcut rows, general info, Sign out (T2). Rows leading to a tab close the modal first. The hero is the server's
// (`GET /api/app/profile`, whoami's role, the session's photo); the prototype's one Mute switch is the two switches in
// Settings, as the server keeps two (GAP P-3).
import * as Clipboard from 'expo-clipboard';
import { type Href, router } from 'expo-router';
import {
  CalendarDays,
  CircleHelp,
  Copy,
  Inbox,
  ListChecks,
  Pencil,
  Settings,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { CountBadge } from '@/components/badge/count-badge';
import { SectionLabel } from '@/components/form/section-label';
import { Row, Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { inboxCountResource } from '@/data/inbox.api';
import { useProfileData } from '@/data/profile';
import { profileResource } from '@/data/profile.api';
import { whoamiResource } from '@/data/whoami.api';

import { SignOutDialog } from '../auth/sign-out';
import { EDIT_FROM_PROFILE } from '../settings/profile-edit.screen';
import { PROFILE as P } from './profile.strings';
import { Tile } from './profile.tiles';
import { ProfileHero } from './profile-hero';

/** Close the profile modal, then open `href` in the tabs under it. */
function leaveTo(href: Href) {
  router.dismiss();
  router.navigate(href);
}

/** The profile modal. */
export function ProfileScreen() {
  const notice = useNotice();
  // The hero and the Inbox row read the server: ask once for each (ensure() never asks twice).
  useEffect(() => {
    void profileResource.ensure();
    void whoamiResource.ensure();
    void inboxCountResource.ensure();
  }, []);
  const d = useProfileData();
  const [signingOut, setSigningOut] = useState(false);
  const copyEmail = () =>
    Clipboard.setStringAsync(d.email).then(
      (ok) => notice(ok ? P.copied : P.copyFailed(P.clipboardRefused)),
      (e: unknown) => notice(P.copyFailed(e instanceof Error ? e.message : String(e))),
    );
  return (
    <DetailPage testID="screen-profile" title="" modal>
      <ProfileHero d={d} />
      <Button size="lg" onPress={() => leaveTo(EDIT_FROM_PROFILE)}>
        <ButtonIcon as={Pencil} />
        <ButtonText>{P.editProfile}</ButtonText>
      </Button>
      <Rows>
        <Row
          lead={<Tile icon={ListChecks} tone="green" />}
          title={P.myTasks}
          onPress={() => leaveTo('/tasks')}
        />
        <Row
          lead={<Tile icon={CalendarDays} tone="red" />}
          title={P.myCalendar}
          onPress={() => router.push('/profile/calendar')}
        />
        <Row
          lead={<Tile icon={Inbox} tone="violet" />}
          title={P.inbox}
          accessibilityLabel={d.inbox ? `${P.inbox}, ${d.inbox}` : P.inbox}
          right={d.inbox ? <CountBadge count={d.inbox} /> : undefined}
          onPress={() => leaveTo('/more/inbox')}
        />
        <Row
          lead={<Tile icon={Settings} />}
          title={P.settings}
          onPress={() => leaveTo('/more/settings')}
        />
        <Row
          lead={<Tile icon={CircleHelp} tone="violet" />}
          title={P.help}
          onPress={() => notice(P.helpNotice)}
        />
      </Rows>
      <VStack className="gap-2">
        <SectionLabel>{P.general}</SectionLabel>
        <Rows>
          <Row
            title={d.email}
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
      {/* iOS alert red (MOBILE_STATUS), not the darker Atlas danger; the confirm dialog keeps its destructive button. */}
      <Button
        size="lg"
        variant="destructive"
        className="bg-alert data-[active=true]:bg-alert/90"
        onPress={() => setSigningOut(true)}
      >
        <ButtonText>{P.signOut}</ButtonText>
      </Button>
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </DetailPage>
  );
}
