import { Accordion, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { ApiKeysCard } from '~/components/profile/ApiKeysCard';
import { LinkedAccountsCard } from '~/components/profile/LinkedAccountsCard';
import { LoginHistoryCard } from '~/components/profile/LoginHistoryCard';
import { PasswordCard } from '~/components/profile/PasswordCard';
import { SessionsCard } from '~/components/profile/SessionsCard';
import { authClient } from '~/lib/auth-client';
import type { LoginRow } from '~/lib/login-logs-api';
import { type DeviceSession, hasPasswordAccount, type LinkedAccount } from '~/lib/profile-api';
import { ADVANCED_COPY } from './account.copy';
import { DeleteAccountCard } from './DeleteAccountCard';

export type AdvancedFlags = {
  /** Email sign-in is on, so the password and linked-account cards make sense. */
  emailAuthEnabled: boolean;
  googleEnabled: boolean;
  /** Server decision (Q4/N03): only a Super-admin may delete their own account here. */
  canDeleteAccount: boolean;
};

type AdvancedProps = {
  email: string;
  role: string;
  logins: { rows: LoginRow[]; total: number };
  currentToken: string | undefined;
  flags: AdvancedFlags;
};

/**
 * "Keamanan dan perangkat" (formerly "Lanjutan"): the former /profile cards inside an Accordion that
 * starts closed so the everyday settings stay short (R05 §3.9, P9 G-01). A closed panel renders
 * nothing, so the cards and their queries only load once it is opened.
 */
export function AdvancedSettings(props: AdvancedProps) {
  return (
    <Accordion variant="separated" radius="md">
      <Accordion.Item value="advanced">
        <Accordion.Control>
          <Text fw={600}>{ADVANCED_COPY.title}</Text>
          <Text size="sm" c="dimmed">
            {ADVANCED_COPY.description}
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <AdvancedCards {...props} />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

/** The cards inside "Keamanan dan perangkat"; the delete-account card exists only when the server allows it. */
export function AdvancedCards({ email, role, logins, currentToken, flags }: AdvancedProps) {
  const sessions = useQuery({
    queryKey: ['me-sessions'],
    queryFn: async () => {
      const { data: rows, error } = await authClient.listSessions();
      if (error) throw new Error(error.message ?? 'Gagal memuat sesi');
      return (rows ?? []) as unknown as DeviceSession[];
    },
  });
  // Linked accounts decide the password and delete-account forms; skip the call when neither shows.
  const accounts = useQuery({
    queryKey: ['me-accounts'],
    enabled: flags.emailAuthEnabled || flags.canDeleteAccount,
    queryFn: async () => {
      const { data: rows, error } = await authClient.listAccounts();
      if (error) throw new Error(error.message ?? 'Gagal memuat akun tertaut');
      return (rows ?? []) as unknown as LinkedAccount[];
    },
  });
  const hasPassword = hasPasswordAccount(accounts.data ?? []);

  return (
    <Stack gap="md">
      {flags.emailAuthEnabled && (
        <>
          <PasswordCard
            hasPassword={hasPassword}
            loading={accounts.isPending}
            onChanged={() => sessions.refetch()}
          />
          <LinkedAccountsCard
            accounts={accounts.data ?? []}
            googleEnabled={flags.googleEnabled}
            loading={accounts.isPending}
            error={accounts.isError ? accounts.error.message : null}
            onRetry={() => accounts.refetch()}
            onChanged={() => accounts.refetch()}
          />
        </>
      )}
      <SessionsCard
        sessions={sessions.data ?? []}
        currentToken={currentToken}
        loading={sessions.isPending}
        error={sessions.isError ? sessions.error.message : null}
        onRetry={() => sessions.refetch()}
        onChanged={() => sessions.refetch()}
      />
      <LoginHistoryCard rows={logins.rows} total={logins.total} />
      <ApiKeysCard role={role} />
      {flags.canDeleteAccount && (
        <DeleteAccountCard
          email={email}
          hasPassword={hasPassword}
          passwordKnown={!accounts.isPending}
        />
      )}
    </Stack>
  );
}
