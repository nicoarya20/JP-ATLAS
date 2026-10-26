import { Button, Checkbox, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PASSWORD_MIN_LEN } from '@server/account/password-rules';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { authClient } from '~/lib/auth-client';
import { SettingsCard } from '../settings/SettingsParts';
import { CreatePasswordCard } from './CreatePasswordCard';

// One floor for both forms, shared with the server rule so the two can never drift apart.
const MIN_LEN = PASSWORD_MIN_LEN;

/**
 * The password half of "Keamanan dan perangkat". An account with a password gets the change form
 * (old password required); an account that only has Google gets `CreatePasswordCard` instead of the
 * dead end this card used to show. `onChanged` must refresh the linked accounts, so the card swaps
 * itself for the change form as soon as the credential exists — no page reload.
 */
export function PasswordCard({
  hasPassword,
  loading = false,
  onChanged,
}: {
  hasPassword: boolean;
  /** Linked accounts are still loading, so "has a password" is not known yet. */
  loading?: boolean;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const nextError =
    next && next.length < MIN_LEN
      ? `Minimal ${MIN_LEN} karakter`
      : next && next === current
        ? 'Harus berbeda dari password saat ini'
        : null;
  const confirmError = confirm && confirm !== next ? 'Konfirmasi tidak sama' : null;
  const ready = current && next && confirm && !nextError && !confirmError;

  const change = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: revokeOthers,
      });
      if (error) throw new Error(error.message ?? 'Password saat ini salah');
    },
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
      notifications.show({
        color: 'teal',
        message: revokeOthers
          ? 'Password diganti. Perangkat lain telah dikeluarkan.'
          : 'Password diganti.',
      });
      onChanged();
    },
    onError: (e: Error) =>
      notifications.show({ color: 'red', title: 'Gagal mengganti password', message: e.message }),
  });

  if (loading) {
    return (
      <SettingsCard title="Password" description="Keamanan masuk dengan email dan password.">
        <Text size="sm" c="dimmed">
          Memuat…
        </Text>
      </SettingsCard>
    );
  }

  if (!hasPassword) return <CreatePasswordCard onCreated={onChanged} />;

  return (
    <SettingsCard
      title="Password"
      description={`Ganti password secara berkala. Minimal ${MIN_LEN} karakter.`}
    >
      <Stack gap="sm" maw={420}>
        <PasswordInput
          label="Password saat ini"
          value={current}
          onChange={(e) => setCurrent(e.currentTarget.value)}
          autoComplete="current-password"
          required
        />
        <PasswordInput
          label="Password baru"
          value={next}
          onChange={(e) => setNext(e.currentTarget.value)}
          autoComplete="new-password"
          error={nextError}
          required
        />
        <PasswordInput
          label="Ulangi password baru"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          autoComplete="new-password"
          error={confirmError}
          required
        />
        <Checkbox
          label="Keluarkan semua perangkat lain setelah ganti"
          checked={revokeOthers}
          onChange={(e) => setRevokeOthers(e.currentTarget.checked)}
        />
      </Stack>
      <Group justify="flex-end">
        <Text size="xs" c="dimmed" style={{ flex: 1 }}>
          Sesi di perangkat ini tetap masuk.
        </Text>
        <Button onClick={() => change.mutate()} loading={change.isPending} disabled={!ready}>
          Ganti password
        </Button>
      </Group>
    </SettingsCard>
  );
}
