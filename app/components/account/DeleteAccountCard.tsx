import { Anchor, Button, Group, List, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router';
import { notify } from '~/components/ui/notify';
import { authClient } from '~/lib/auth-client';
import { canConfirmDelete, type DeleteCheck, fetchDeleteCheck } from '~/lib/profile-api';
import { SettingsCard } from '../settings/SettingsParts';
import { DELETE_ACCOUNT_COPY as COPY } from './account.copy';

/** Delete form (T3): the impact in plain words, the email typed back, the password when the account has one. */
export function DeleteForm({
  email,
  needsPassword,
  onClose,
}: {
  email: string;
  needsPassword: boolean;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.deleteUser(needsPassword ? { password } : {});
      if (error) throw new Error(error.message ?? COPY.failedFallback);
    },
    onSuccess: () => {
      onClose();
      // A full load, so no cached data of the deleted account survives in the browser.
      window.location.assign('/login');
    },
    onError: (err) => notify.fail(COPY.failed, err),
  });
  const ready = canConfirmDelete({ typed, email, needsPassword, password });
  return (
    <Stack gap="sm">
      <Text size="sm">{COPY.impact}</Text>
      <Text size="sm">
        {COPY.typeEmail} <strong>{email}</strong>
      </Text>
      <TextInput
        value={typed}
        onChange={(e) => setTyped(e.currentTarget.value)}
        placeholder={email}
        inputMode="email"
        data-autofocus
      />
      {needsPassword && (
        <PasswordInput
          label={COPY.password}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          autoComplete="current-password"
        />
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={onClose} disabled={remove.isPending}>
          {COPY.cancel}
        </Button>
        <Button
          color="red"
          onClick={() => remove.mutate()}
          loading={remove.isPending}
          disabled={!ready}
        >
          {COPY.confirm}
        </Button>
      </Group>
    </Stack>
  );
}

/** What stops the deletion: the projects that would be left without a manager, each a link. */
export function BlockedList({ check, onClose }: { check: DeleteCheck; onClose: () => void }) {
  const more = check.total - check.projects.length;
  return (
    <Stack gap="sm">
      <Text size="sm">{COPY.blockedBody}</Text>
      <List size="sm" spacing={4}>
        {check.projects.map((p) => (
          <List.Item key={p.id}>
            <Anchor component={Link} to={`/app/projects/${p.id}`} onClick={onClose}>
              {p.name}
            </Anchor>
          </List.Item>
        ))}
      </List>
      {more > 0 && <Text size="sm">{COPY.blockedMore(more)}</Text>}
      <Group justify="flex-end">
        <Button onClick={onClose}>{COPY.understood}</Button>
      </Group>
    </Stack>
  );
}

/**
 * "Hapus akun" (T3). The server is asked when the button is pressed, not when the page loads, so the
 * answer is fresh: with blocking projects the dialog explains what to do instead of offering a form
 * that the server would refuse (the server checks again on delete).
 */
export function DeleteAccountCard({
  email,
  hasPassword,
  passwordKnown = true,
}: {
  email: string;
  hasPassword: boolean;
  /** False while linked accounts load: until then we cannot tell whether a password is needed. */
  passwordKnown?: boolean;
}) {
  const open = useMutation({
    mutationFn: fetchDeleteCheck,
    onSuccess: (check) => {
      const id = modals.open({
        title: check.canDelete ? COPY.modalTitle : COPY.blockedTitle,
        children: check.canDelete ? (
          <DeleteForm email={email} needsPassword={hasPassword} onClose={() => modals.close(id)} />
        ) : (
          <BlockedList check={check} onClose={() => modals.close(id)} />
        ),
      });
    },
    onError: (err) => notify.fail(COPY.checkFailed, err),
  });
  return (
    <SettingsCard title={COPY.cardTitle} description={COPY.cardDescription}>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Stack gap={4} flex="1 1 260px">
          <Group gap="xs">
            <FiAlertTriangle size="1.25em" color="var(--mantine-color-red-6)" />
            <Text fw={500}>{COPY.cardTitle}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {COPY.cardBody}
          </Text>
        </Stack>
        <Button
          color="red"
          variant="outline"
          loading={open.isPending}
          disabled={!passwordKnown}
          onClick={() => open.mutate()}
        >
          {COPY.open}
        </Button>
      </Group>
    </SettingsCard>
  );
}
