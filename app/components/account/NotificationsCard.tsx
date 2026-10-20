import { Loader, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { type NotificationPrefs, putNotificationPrefs } from '~/lib/profile-api';
import { SettingsCard } from '../settings/SettingsParts';
import { NOTIFICATIONS_COPY } from './account.copy';

const SWITCHES = [
  {
    key: 'eventReminder',
    label: NOTIFICATIONS_COPY.eventReminder,
    hint: NOTIFICATIONS_COPY.eventReminderHint,
  },
  { key: 'inboxNews', label: NOTIFICATIONS_COPY.inboxNews, hint: NOTIFICATIONS_COPY.inboxNewsHint },
] as const satisfies readonly { key: keyof NotificationPrefs; label: string; hint: string }[];

/**
 * Two switches, each saved the moment it is flipped: the screen changes first, a failure puts the
 * switch back and says so. The "Perlu Anda tanggapi" cards have no switch on purpose (wireframe 09 #4).
 */
export function NotificationsCard({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const save = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) => putNotificationPrefs(patch),
    onMutate: (patch) => {
      const before = prefs;
      setPrefs({ ...prefs, ...patch });
      return { before };
    },
    onSuccess: (saved) => {
      setPrefs(saved);
      notifications.show({ color: 'teal', message: NOTIFICATIONS_COPY.saved });
    },
    onError: (err, _patch, ctx) => {
      if (ctx) setPrefs(ctx.before);
      notify.fail(NOTIFICATIONS_COPY.saveFailed, err);
    },
  });

  return (
    <SettingsCard title={NOTIFICATIONS_COPY.title} description={NOTIFICATIONS_COPY.description}>
      <Stack gap="md">
        {SWITCHES.map(({ key, label, hint }) => {
          const pending = save.isPending && key in (save.variables ?? {});
          return (
            <Switch
              key={key}
              label={label}
              description={hint}
              checked={prefs[key]}
              disabled={save.isPending}
              thumbIcon={pending ? <Loader size="0.6em" color="gray" /> : undefined}
              onChange={(e) => save.mutate({ [key]: e.currentTarget.checked })}
            />
          );
        })}
        <Text size="sm" c="dimmed">
          {NOTIFICATIONS_COPY.always}
        </Text>
      </Stack>
    </SettingsCard>
  );
}
