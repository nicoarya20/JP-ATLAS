import { Alert, Button, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PASSWORD_MIN_LEN } from '@server/account/password-rules';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import {
  canSubmitCreatePassword,
  createPasswordErrors,
  createPasswordSuccessMessage,
} from '~/lib/password-form';
import { createMyPassword } from '~/lib/profile-api';
import { SettingsCard } from '../settings/SettingsParts';

export const CREATE_PASSWORD_TITLE = 'Buat password';

/**
 * First password for an account born from Google, so its owner can also sign in with email and
 * password — the only way into the mobile app. There is no "password saat ini" field because there
 * is no password yet; `PasswordCard` swaps itself for the change form once this one succeeds.
 */
export function CreatePasswordCard({ onCreated }: { onCreated: () => void }) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const errors = createPasswordErrors(next, confirm);

  const create = useMutation({
    mutationFn: () => createMyPassword(next),
    onSuccess: (result) => {
      setNext('');
      setConfirm('');
      notifications.show({
        color: 'teal',
        message: createPasswordSuccessMessage(result.otherSessionsRevoked),
      });
      onCreated();
    },
    onError: (e: Error) =>
      notifications.show({ color: 'red', title: 'Gagal membuat password', message: e.message }),
  });

  return (
    <SettingsCard
      title="Password"
      description={`Akun ini masuk lewat Google dan belum punya password. Buat satu agar bisa masuk dengan email dan password juga — misalnya di aplikasi mobile. Minimal ${PASSWORD_MIN_LEN} karakter.`}
    >
      <Stack gap="sm" maw={420}>
        <PasswordInput
          label="Password baru"
          value={next}
          onChange={(e) => setNext(e.currentTarget.value)}
          autoComplete="new-password"
          error={errors.next}
          required
        />
        <PasswordInput
          label="Ulangi password baru"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          autoComplete="new-password"
          error={errors.confirm}
          required
        />
      </Stack>
      {/* Said before the button, not after: this creates a permanent second way into the account,
          and every other device is signed out the moment it exists. */}
      <Alert color="blue" variant="light" icon={<FiInfo size="1.25em" />}>
        Setelah dibuat, kamu bisa masuk dengan email dan password ini. Perangkat lain akan
        dikeluarkan untuk keamanan; sesi di perangkat ini tetap masuk.
      </Alert>
      <Group justify="flex-end">
        <Text size="xs" c="dimmed" style={{ flex: 1 }}>
          Masuk dengan Google tetap bisa dipakai seperti biasa.
        </Text>
        <Button
          onClick={() => create.mutate()}
          loading={create.isPending}
          disabled={!canSubmitCreatePassword(next, confirm)}
        >
          {CREATE_PASSWORD_TITLE}
        </Button>
      </Group>
    </SettingsCard>
  );
}
