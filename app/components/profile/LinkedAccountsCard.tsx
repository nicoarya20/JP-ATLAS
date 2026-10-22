import { Alert, Badge, Button, Group, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { FcGoogle } from 'react-icons/fc';
import { FiAlertCircle, FiKey, FiLink, FiLink2 } from 'react-icons/fi';
import { notify } from '~/components/ui/notify';
import { authClient } from '~/lib/auth-client';
import { type LinkedAccount, providerLabel } from '~/lib/profile-api';
import { useTimeFormat } from '~/lib/time-format';
import { SettingRow, SettingsCard } from '../settings/SettingsParts';

type Props = {
  accounts: LinkedAccount[];
  googleEnabled: boolean;
  loading: boolean;
  /** Why the list could not be loaded; without it an empty list would read as "no sign-in method". */
  error?: string | null;
  onRetry?: () => void;
  onChanged: () => void;
};

/** Providers linked to this account; link Google, unlink when another way in remains. */
export function LinkedAccountsCard({
  accounts,
  googleEnabled,
  loading,
  error,
  onRetry,
  onChanged,
}: Props) {
  const { relative: formatRelative } = useTimeFormat();
  const hasGoogle = accounts.some((a) => a.providerId === 'google');

  const unlink = useMutation({
    mutationFn: async (account: LinkedAccount) => {
      // This Better Auth version keys unlinking by the provider's account id.
      const { error } = await authClient.unlinkAccount({
        accountId: account.accountId ?? account.id,
      });
      if (error) throw new Error(error.message ?? 'Server menolak');
    },
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Akun dilepas.' });
      onChanged();
    },
    onError: (err) => notify.fail('Gagal melepas akun', err),
  });
  const link = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.linkSocial({
        provider: 'google',
        callbackURL: '/app/settings',
      });
      if (error) throw new Error(error.message ?? 'Server menolak');
    },
    onError: (err) => notify.fail('Gagal menautkan Google', err),
  });

  const confirmUnlink = (a: LinkedAccount) =>
    modals.openConfirmModal({
      title: `Lepas ${providerLabel(a.providerId)}?`,
      children: (
        <Text size="sm">
          Anda tidak bisa lagi masuk lewat {providerLabel(a.providerId)}. Cara masuk lainnya tetap
          berlaku.
        </Text>
      ),
      labels: { confirm: 'Lepas akun', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: () => unlink.mutate(a),
    });

  return (
    <SettingsCard
      title="Cara masuk"
      description="Provider yang tertaut ke akun ini. Sisakan minimal satu cara masuk."
    >
      {loading && (
        <Text size="sm" c="dimmed">
          Memuat…
        </Text>
      )}
      {error && (
        <Alert color="red" icon={<FiAlertCircle size="1.25em" />} title="Gagal memuat cara masuk">
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
      {accounts.map((a) => (
        <SettingRow
          key={a.id}
          label={providerLabel(a.providerId)}
          description={a.createdAt ? `Tertaut ${formatRelative(String(a.createdAt))}` : 'Tertaut'}
          badge={
            <Badge
              variant="light"
              leftSection={
                a.providerId === 'google' ? <FcGoogle size="1.25em" /> : <FiKey size="1.25em" />
              }
            >
              {a.providerId}
            </Badge>
          }
          control={
            <Tooltip
              label="Tidak bisa dilepas: ini satu-satunya cara masuk"
              disabled={accounts.length > 1}
              withArrow
            >
              <Button
                variant="subtle"
                color="red"
                leftSection={<FiLink2 size="1.25em" />}
                disabled={accounts.length <= 1}
                loading={unlink.isPending && unlink.variables?.id === a.id}
                onClick={() => confirmUnlink(a)}
              >
                Lepas
              </Button>
            </Tooltip>
          }
        />
      ))}
      {googleEnabled && !hasGoogle && (
        <Group justify="flex-end">
          <Button
            variant="default"
            leftSection={<FiLink size="1.25em" />}
            loading={link.isPending}
            onClick={() => link.mutate()}
          >
            Tautkan Google
          </Button>
        </Group>
      )}
    </SettingsCard>
  );
}
