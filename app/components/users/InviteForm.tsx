import { Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { DENY_UI } from '@server/access/decision';
import { canInviteWithRole } from '@server/access/user.policy';
import { useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { ROLE_LABEL } from '~/lib/admin-users-api';
import { ASSIGNABLE_ROLES, principalOf, type UserPermissions } from './user-access';

type Props = {
  perms: UserPermissions;
  loading: boolean;
  /** Creates the invitation; `onCreated` runs only on success (failures are toasted by the caller). */
  onSubmit: (email: string, role: string, onCreated: () => void) => void;
};

/** Form for a pre-approval invitation: only roles the actor may grant are offered. */
export function InviteForm({ perms, loading, onSubmit }: Props) {
  const principal = principalOf(perms);
  const roles = ASSIGNABLE_ROLES.filter((r) => canInviteWithRole(principal, r).ok);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(roles[0] ?? 'member');
  const [error, setError] = useState<string | null>(null);
  const blocked = principal.impersonating ? DENY_UI.IMPERSONATING.message : null;

  const submit = () => {
    const value = email.trim();
    if (!value.includes('@')) {
      setError('Tulis alamat email lengkap, contoh: nama@kantor.id.');
      return;
    }
    setError(null);
    // The typed email stays after a failure so it can be corrected and sent again.
    onSubmit(value, role, () => setEmail(''));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Stack gap="sm">
        <Group align="flex-start" gap="sm" wrap="wrap">
          <TextInput
            label="Email orang yang diundang"
            placeholder="nama@kantor.id"
            description="Harus sama dengan email Google yang akan dipakai untuk masuk."
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={error}
            inputMode="email"
            autoComplete="off"
            disabled={blocked !== null}
            flex="1 1 260px"
            miw={0}
          />
          <Select
            label="Peran"
            value={role}
            onChange={(v) => v && setRole(v)}
            data={roles.map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r }))}
            allowDeselect={false}
            disabled={blocked !== null}
            w={{ base: '100%', sm: 200 }}
          />
        </Group>
        <Group gap="sm" wrap="wrap">
          <Button
            type="submit"
            leftSection={<FiSend size={14} />}
            loading={loading}
            disabled={blocked !== null || email.trim() === ''}
          >
            Buat undangan
          </Button>
          {blocked && (
            <Text size="sm" c="dimmed">
              {blocked}
            </Text>
          )}
        </Group>
      </Stack>
    </form>
  );
}
