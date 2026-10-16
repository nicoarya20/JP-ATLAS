import { Group, Stack, Text, Title } from '@mantine/core';
import { listLogins } from '@server/api/analytics-logins.query';
import { hasGoogleAuth, isProd } from '@server/env';
import { requireUser } from '@server/guard';
import { canAccessDev } from '@server/permissions';
import { getProfile } from '@server/profile/profile.service';
import { getSettings } from '@server/settings';
import { resolveTextSize } from '@server/text-size.loader';
import { data, useRevalidator } from 'react-router';
import { AccountCard } from '~/components/account/AccountCard';
import { AdvancedSettings } from '~/components/account/AdvancedSettings';
import { AppearanceCard } from '~/components/account/AppearanceCard';
import { SETTINGS_INTRO, SETTINGS_TITLE } from '~/components/account/account.copy';
import { SignOutButton } from '~/components/account/SignOutButton';
import { useApp } from '~/lib/app-context';
import { useSession } from '~/lib/auth-client';
import { toJson } from '~/lib/loader-json';
import type { LoginRow } from '~/lib/login-logs-api';
import { loginAuthMode } from '~/lib/login-mode';
import type { MyProfile } from '~/lib/profile-api';
import type { Route } from './+types/settings';

export function meta() {
  return [{ title: 'Pengaturan — Simple PM' }];
}

const HISTORY = 8;

/**
 * Profile, text size and the moved /profile cards. Every permission is decided here, so the page
 * never compares a role: deleting an account is Super-admin only (Q4/N03) and never while
 * impersonating (Q9), and the password cards follow the effective email sign-in mode.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireUser(request);
  const [profile, logins, settings, textSize] = await Promise.all([
    getProfile(auth.user.id),
    listLogins({ userId: auth.user.id, limit: String(HISTORY) }),
    getSettings(),
    resolveTextSize(request),
  ]);
  if (!profile) throw data('Profil tidak ditemukan', { status: 404 });
  return {
    profile: profile satisfies MyProfile,
    textSize,
    logins: toJson<{ rows: LoginRow[]; total: number }>(logins),
    flags: {
      emailAuthEnabled: loginAuthMode(isProd, settings).emailAuthEnabled,
      googleEnabled: hasGoogleAuth,
      canDeleteAccount: canAccessDev(auth.role) && !auth.impersonatedBy,
    },
  };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { user: ctxUser, role } = useApp();
  const { data: session, refetch: refetchSession } = useSession();
  const revalidator = useRevalidator();
  const user = session?.user ?? ctxUser;
  const currentToken = (session?.session as { token?: string } | undefined)?.token;
  const refresh = () => {
    refetchSession();
    revalidator.revalidate();
  };

  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }} maw={880} w="100%">
      <div>
        <Title order={2}>{SETTINGS_TITLE}</Title>
        <Text c="dimmed">{SETTINGS_INTRO}</Text>
      </div>
      <AccountCard profile={loaderData.profile} image={user.image ?? null} onSaved={refresh} />
      <AppearanceCard textSize={loaderData.textSize} />
      <Group justify="flex-end" wrap="wrap">
        <SignOutButton />
      </Group>
      <AdvancedSettings
        email={loaderData.profile.email}
        role={role}
        logins={loaderData.logins}
        currentToken={currentToken}
        flags={loaderData.flags}
      />
    </Stack>
  );
}
