// Settings parts: the labelled group (prototype settings.main.jsx Group) and the two notification switches, read from
// and saved to `/api/app/profile/notifications`. A flip shows at once and goes back, with the reason, if the server
// refuses it.
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { isApiError } from '@/api/errors';
import { SectionLabel } from '@/components/form/section-label';
import { SwitchRow } from '@/components/form/switch-row';
import { useNotice } from '@/components/notice/use-notice';
import { SectionCard } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { writeError } from '@/components/state/write-error';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type NotificationPrefsWire, notificationsResource } from '@/data/profile.api';
import { saveNotifications } from '@/data/profile.write';

import { SETTINGS as S } from './settings.strings';

/** Labelled group of setting rows with an optional footnote. */
export function Group({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      <SectionLabel>{label}</SectionLabel>
      <SectionCard>{children}</SectionCard>
      {note && <Text className="text-footnote text-muted-foreground">{note}</Text>}
    </VStack>
  );
}

type Key = keyof NotificationPrefsWire;

/** Event reminders and Inbox updates; the cards that need an answer always come (the group's note says so). */
export function NotificationSwitches() {
  const notice = useNotice();
  const state = notificationsResource.useSnapshot();
  // What the switches show while a flip is out, and after: the server's answer to it.
  const [shown, setShown] = useState<NotificationPrefsWire | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void notificationsResource.ensure();
  }, []);
  const prefs = shown ?? state.data;
  if (!prefs) {
    return state.phase === 'failed' ? (
      <FailedState
        testID="notifications-failed"
        message={state.error?.message}
        onRetry={() => void notificationsResource.reload()}
      />
    ) : (
      <LoadingState testID="notifications-loading" />
    );
  }
  const flip = async (key: Key, on: boolean) => {
    setShown({ ...prefs, [key]: on });
    setBusy(true);
    try {
      setShown(await saveNotifications({ [key]: on }));
    } catch (e) {
      setShown(prefs);
      notice(writeError(e));
      if (!isApiError(e)) throw e;
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SwitchRow
        label={S.reminders}
        sub={S.remindersHint}
        value={prefs.eventReminder}
        disabled={busy}
        onChange={(on) => void flip('eventReminder', on)}
      />
      <SwitchRow
        label={S.inboxUpdates}
        sub={S.inboxUpdatesHint}
        value={prefs.inboxNews}
        disabled={busy}
        onChange={(on) => void flip('inboxNews', on)}
      />
    </>
  );
}
