// Profile ① , a full-height modal from the More panel's profile card: who I am as the server has
// me, the shortcut rows, the two notification switches it really keeps, and Sign out (T2). Rows
// leading to a tab close the modal first.
import * as Clipboard from 'expo-clipboard';
import { type Href, router } from 'expo-router';
import {
  Bell,
  CalendarDays,
  CircleHelp,
  Copy,
  Inbox,
  ListChecks,
  Pencil,
  Settings,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { SectionLabel } from '@/components/form/section-label';
import { Row, Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { ensureInboxCount } from '@/data/inbox.api';
import { getProfile } from '@/data/profile';
import {
  ensureNotificationPrefs,
  ensureProfile,
  type NotificationPrefsWire,
  notificationPrefsResource,
  profileResource,
  saveNotificationPrefs,
} from '@/data/profile.api';
import { ensureWhoami, whoamiResource } from '@/data/whoami.api';

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

/**
 * The two switches the server keeps. A card in the action lane is never silenced — somebody has to
 * answer it — so the note under them says which notifications these two cover and which arrive
 * whatever happens.
 */
function Notifications() {
  const notice = useNotice();
  const state = notificationPrefsResource.use();
  const [saving, setSaving] = useState<keyof NotificationPrefsWire | null>(null);
  const prefs = state.data;
  const flip = async (key: keyof NotificationPrefsWire, value: boolean) => {
    setSaving(key);
    try {
      await saveNotificationPrefs({ [key]: value });
    } catch (e) {
      // The server's own sentence, as it came (K5); the switch snaps back because what is drawn is
      // the stored value, not the finger's intent.
      notice(P.saveFailed(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(null);
    }
  };
  const row = (key: keyof NotificationPrefsWire, title: string, sub: string) => (
    <Row
      lead={<Tile icon={Bell} tone="indigo" />}
      title={title}
      sub={sub}
      right={
        <Switch
          accessibilityLabel={title}
          accessibilityState={{ busy: saving === key, disabled: !prefs || saving !== null }}
          isDisabled={!prefs || saving !== null}
          value={prefs?.[key] ?? false}
          onValueChange={(v) => void flip(key, v)}
        />
      }
    />
  );
  return (
    <VStack className="gap-2">
      <SectionLabel>{P.notifications}</SectionLabel>
      <Rows>
        {row('eventReminder', P.eventReminder, P.eventReminderSub)}
        {row('inboxNews', P.inboxNews, P.inboxNewsSub)}
      </Rows>
      <Text className="text-footnote text-muted-foreground">{P.alwaysOn}</Text>
    </VStack>
  );
}

/** The profile modal. */
export function ProfileScreen() {
  const notice = useNotice();
  // Subscribed so the modal fills in as each answer lands; the data itself is read synchronously.
  profileResource.use();
  whoamiResource.use();
  const d = getProfile();
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    void ensureProfile();
    void ensureWhoami();
    void ensureNotificationPrefs();
    void ensureInboxCount();
  }, []);
  const copyEmail = () =>
    Clipboard.setStringAsync(d.me.email).then(
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
      <Notifications />
      <VStack className="gap-2">
        <SectionLabel>{P.general}</SectionLabel>
        <Rows>
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
