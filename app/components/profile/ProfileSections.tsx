import { Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '~/lib/app-context';
import { authClient, useSession } from '~/lib/auth-client';
import type { LoginRow } from '~/lib/login-logs-api';
import { type DeviceSession, hasPasswordAccount, type LinkedAccount } from '~/lib/profile-api';
import { ApiKeysCard } from './ApiKeysCard';
import { DangerZoneCard } from './DangerZoneCard';
import { LinkedAccountsCard } from './LinkedAccountsCard';
import { LoginHistoryCard } from './LoginHistoryCard';
import { PasswordCard } from './PasswordCard';
import { ProfileForm } from './ProfileForm';
import { ProfileHeader } from './ProfileHeader';
import { SessionsCard } from './SessionsCard';

type Props = {
  logins: { rows: LoginRow[]; total: number };
  googleEnabled: boolean;
};

/** Identity, password, linked accounts, sessions, API keys, login history and danger zone, shared by /profile and /app/settings. */
export function ProfileSections({ logins, googleEnabled }: Props) {
  const { user: ctxUser, role } = useApp();
  const { data, refetch: refetchSession } = useSession();
  const user = data?.user ?? ctxUser;
  const currentToken = (data?.session as { token?: string } | undefined)?.token;

  const sessions = useQuery({
    queryKey: ['me-sessions'],
    queryFn: async () => {
      const { data: rows, error } = await authClient.listSessions();
      if (error) throw new Error(error.message ?? 'Gagal memuat sesi');
      return (rows ?? []) as unknown as DeviceSession[];
    },
  });
  const accounts = useQuery({
    queryKey: ['me-accounts'],
    queryFn: async () => {
      const { data: rows, error } = await authClient.listAccounts();
      if (error) throw new Error(error.message ?? 'Gagal memuat akun tertaut');
      return (rows ?? []) as unknown as LinkedAccount[];
    },
  });
  const hasPassword = hasPasswordAccount(accounts.data ?? []);

  return (
    <Stack gap="md">
      <ProfileHeader user={user} role={role} />
      <ProfileForm user={user} onSaved={() => refetchSession()} />
      <PasswordCard hasPassword={hasPassword} onChanged={() => sessions.refetch()} />
      <LinkedAccountsCard
        accounts={accounts.data ?? []}
        googleEnabled={googleEnabled}
        loading={accounts.isPending}
        onChanged={() => accounts.refetch()}
      />
      <SessionsCard
        sessions={sessions.data ?? []}
        currentToken={currentToken}
        loading={sessions.isPending}
        onChanged={() => sessions.refetch()}
      />
      <ApiKeysCard role={role} />
      <LoginHistoryCard rows={logins.rows} total={logins.total} />
      <DangerZoneCard email={user.email} hasPassword={hasPassword} />
    </Stack>
  );
}
