import { Alert, Badge, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { FiAlertCircle, FiLogOut, FiMonitor, FiSmartphone } from 'react-icons/fi';
import { confirmAction } from '~/components/ui/confirmAction';
import { notify } from '~/components/ui/notify';
import { authClient } from '~/lib/auth-client';
import { type DeviceSession, describeSession, isCurrentSession } from '~/lib/profile-api';
import { useTimeFormat } from '~/lib/time-format';
import { SettingsCard } from '../settings/SettingsParts';

type Props = {
  sessions: DeviceSession[];
  currentToken: string | null | undefined;
  loading: boolean;
  /** Why the list could not be loaded; shown instead of the (wrong) "no sessions" line. */
  error?: string | null;
  onRetry?: () => void;
  onChanged: () => void;
};

/** Devices currently signed in; revoke one (with a confirmation) or all others. */
export function SessionsCard({
  sessions,
  currentToken,
  loading,
  error,
  onRetry,
  onChanged,
}: Props) {
  const { dateTime: formatDateTime, relative: formatRelative } = useTimeFormat();
  const others = sessions.filter((s) => !isCurrentSession(s, currentToken));
  const revokeOne = useMutation({
    mutationFn: async (token: string) => {
      const { error: err } = await authClient.revokeSession({ token });
      if (err) throw new Error(err.message ?? 'Server menolak. Coba lagi.');
    },
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Perangkat dikeluarkan.' });
      onChanged();
    },
    onError: (err) => notify.fail('Gagal mengeluarkan perangkat', err),
  });
  const revokeOthers = useMutation({
    mutationFn: async () => {
      const { error: err } = await authClient.revokeOtherSessions();
      if (err) throw new Error(err.message ?? 'Server menolak. Coba lagi.');
    },
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Semua perangkat lain dikeluarkan.' });
      onChanged();
    },
    onError: (err) => notify.fail('Gagal mengeluarkan perangkat lain', err),
  });

  const confirmOne = (s: DeviceSession) =>
    confirmAction({
      title: 'Keluarkan perangkat ini?',
      body: `${describeSession(s.userAgent).summary} akan diputus dan harus masuk ulang.`,
      confirmLabel: 'Keluarkan perangkat',
      danger: true,
      onConfirm: () => revokeOne.mutate(s.token),
    });
  const confirmOthers = () =>
    confirmAction({
      title: 'Keluarkan semua perangkat lain?',
      body: `${others.length} sesi lain akan diputus dan harus masuk ulang. Perangkat ini tetap masuk.`,
      confirmLabel: 'Keluarkan perangkat lain',
      danger: true,
      onConfirm: () => revokeOthers.mutate(),
    });

  return (
    <SettingsCard
      title="Perangkat yang sedang masuk"
      description="Sesi aktif akun ini. Keluarkan perangkat yang tidak Anda kenali."
      aside={
        others.length > 0 ? (
          <Button
            variant="light"
            color="red"
            leftSection={<FiLogOut size="1.25em" />}
            loading={revokeOthers.isPending}
            onClick={confirmOthers}
          >
            {`Keluarkan ${others.length} perangkat lain`}
          </Button>
        ) : undefined
      }
    >
      {loading && (
        <Text size="sm" c="dimmed">
          Memuat…
        </Text>
      )}
      {error && (
        <Alert color="red" icon={<FiAlertCircle size="1.25em" />} title="Gagal memuat perangkat">
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="sm">{error}</Text>
            {onRetry && (
              <Button variant="light" color="red" onClick={onRetry}>
                Coba lagi
              </Button>
            )}
          </Group>
        </Alert>
      )}
      {!loading && !error && sessions.length === 0 && (
        <Text size="sm" c="dimmed">
          Tidak ada sesi aktif.
        </Text>
      )}
      <Stack gap="sm">
        {sessions.map((s) => {
          const d = describeSession(s.userAgent);
          const current = isCurrentSession(s, currentToken);
          const Icon = d.device === 'Mobile' || d.device === 'Tablet' ? FiSmartphone : FiMonitor;
          return (
            <Group key={s.id} justify="space-between" wrap="wrap" gap="xs">
              <Group gap="sm" wrap="nowrap" miw={0} flex={1}>
                {/* A react-icons SVG takes no Mantine style props. */}
                <Icon size="1.25em" style={{ flexShrink: 0, opacity: 0.7 }} />
                <Stack gap={0} miw={0}>
                  <Group gap="xs" wrap="wrap">
                    <Text size="sm" fw={500} lh={1.3}>
                      {d.summary}
                    </Text>
                    {current && (
                      <Badge variant="light" color="teal">
                        Perangkat ini
                      </Badge>
                    )}
                  </Group>
                  <Tooltip
                    label={`Masuk ${formatDateTime(String(s.createdAt))} · berakhir ${formatDateTime(String(s.expiresAt))}`}
                    withArrow
                  >
                    <Text size="xs" c="dimmed" lh={1.3}>
                      {s.ipAddress ?? 'IP tidak diketahui'} · aktif{' '}
                      {formatRelative(String(s.updatedAt))}
                    </Text>
                  </Tooltip>
                </Stack>
              </Group>
              {!current && (
                <Button
                  variant="subtle"
                  color="red"
                  loading={revokeOne.isPending && revokeOne.variables === s.token}
                  onClick={() => confirmOne(s)}
                >
                  Keluarkan perangkat ini
                </Button>
              )}
            </Group>
          );
        })}
      </Stack>
    </SettingsCard>
  );
}
