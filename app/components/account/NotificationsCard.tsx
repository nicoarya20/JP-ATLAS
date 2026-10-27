import { Group, Loader, Paper, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { type NotificationPrefs, putNotificationPrefs } from '~/lib/profile-api';
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
    <Paper withBorder p={{ base: 'md', md: 'lg' }}>
      <Stack gap="md">
        {SWITCHES.map(({ key, label, hint }) => {
          const pending = save.isPending && key in (save.variables ?? {});
          return (
            <Group key={key} justify="space-between" align="flex-start" wrap="nowrap" gap="md">
              <Stack gap={4} miw={0} flex={1}>
                <Text fw={700}>{label}</Text>
                <Text size="sm" c="dimmed">
                  {hint}
                </Text>
              </Stack>
              <Group gap="xs" wrap="nowrap" flex="0 0 auto">
                <Text size="sm" fw={600}>
                  {prefs[key] ? NOTIFICATIONS_COPY.on : NOTIFICATIONS_COPY.off}
                </Text>
                <Switch
                  aria-label={label}
                  checked={prefs[key]}
                  disabled={save.isPending}
                  thumbIcon={pending ? <Loader size="0.6em" color="gray" /> : undefined}
                  onChange={(e) => save.mutate({ [key]: e.currentTarget.checked })}
                />
              </Group>
            </Group>
          );
        })}
        <Text size="sm" c="dimmed">
          {NOTIFICATIONS_COPY.always}
        </Text>
      </Stack>
    </Paper>
  );
}
