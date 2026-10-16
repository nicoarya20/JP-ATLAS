import { Button, Stack, Text, Title } from '@mantine/core';
import { listLogins } from '@server/api/analytics-logins.query';
import { hasGoogleAuth } from '@server/env';
import { requireUser } from '@server/guard';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { AccountCard } from '~/components/preferences/AccountCard';
import { LeaveCard } from '~/components/preferences/LeaveCard';
import { NotificationsCard } from '~/components/preferences/NotificationsCard';
import { TextSizeCard } from '~/components/preferences/TextSizeCard';
import { ProfileSections } from '~/components/profile/ProfileSections';
import { confirmAction } from '~/components/ui/confirmAction';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { useApp } from '~/lib/app-context';
import { signOut } from '~/lib/auth-client';
import { toJson } from '~/lib/loader-json';
import type { LoginRow } from '~/lib/login-logs-api';
import type { Route } from './+types/settings';

export function meta() {
  return [{ title: 'Pengaturan — Simple PM' }];
}

const HISTORY = 8;

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const logins = await listLogins({ userId: user.id, limit: String(HISTORY) });
  return {
    logins: toJson<{ rows: LoginRow[]; total: number }>(logins),
    googleEnabled: hasGoogleAuth,
  };
}

/** Preferences (dummy data for now) on top; the existing profile and security cards stay below. */
export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const { user } = useApp();
  const navigate = useNavigate();

  const leave = () =>
    confirmAction({
      title: 'Keluar dari akun ini?',
      body: 'Kamu akan keluar dari akun ini. Sesi aktif akan dihapus.',
      confirmLabel: 'Keluar',
      danger: true,
      onConfirm: async () => {
        await signOut();
        navigate('/login');
      },
    });

  return (
    <PageContainer size="narrow">
      <PageHeader title="Pengaturan" description="Atur akun, tampilan, dan pemberitahuan Anda" />
      <Title order={5}>Akun saya</Title>
      <AccountCard user={user} />
      <Title order={5}>Tampilan</Title>
      <TextSizeCard />
      <Title order={5}>Pemberitahuan</Title>
      <NotificationsCard />
      <Title order={5}>Ketersediaan</Title>
      <LeaveCard />
      <Stack gap="md" id="profil" style={{ scrollMarginTop: 16 }}>
        <div>
          <Title order={5}>Profil & keamanan</Title>
          <Text size="sm" c="dimmed">
            Kelola identitas, cara masuk, dan perangkat yang terhubung ke akun Anda.
          </Text>
        </div>
        <ProfileSections logins={loaderData.logins} googleEnabled={loaderData.googleEnabled} />
      </Stack>
      <Button
        variant="default"
        leftSection={<FiLogOut size="1.25em" aria-hidden />}
        onClick={leave}
        style={{ alignSelf: 'flex-start' }}
      >
        Keluar
      </Button>
    </PageContainer>
  );
}
