import { Stack, Text, Title } from '@mantine/core';
import { listLogins } from '@server/api/analytics-logins.query';
import { hasGoogleAuth } from '@server/env';
import { requireUser } from '@server/guard';
import { ProfileSections } from '~/components/profile/ProfileSections';
import { toJson } from '~/lib/loader-json';
import type { LoginRow } from '~/lib/login-logs-api';
import type { Route } from './+types/profile';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Profile — Simple PM' }];
}

const HISTORY = 8;

/** Own login history is server-rendered; sessions/accounts come from Better Auth on the client. */
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const logins = await listLogins({ userId: user.id, limit: String(HISTORY) });
  return {
    logins: toJson<{ rows: LoginRow[]; total: number }>(logins),
    googleEnabled: hasGoogleAuth,
  };
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }} maw={880}>
      <div>
        <Title order={3}>Profil & keamanan</Title>
        <Text size="sm" c="dimmed">
          Kelola identitas, cara masuk, dan perangkat yang terhubung ke akun Anda.
        </Text>
      </div>
      <ProfileSections logins={loaderData.logins} googleEnabled={loaderData.googleEnabled} />
    </Stack>
  );
}
