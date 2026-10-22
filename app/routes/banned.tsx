import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { heldKindOf } from '@server/account/status';
import { auth } from '@server/auth';
import { describeBan } from '@server/ban';
import { getBranding } from '@server/settings-branding';
import { FiClock, FiHome, FiLifeBuoy, FiSlash } from 'react-icons/fi';
import { Link, redirect } from 'react-router';
import { HoldLeaveButton, HoldShell } from '~/components/account/HoldShell';
import { useTimeFormat } from '~/lib/time-format';
import type { Route } from './+types/banned';

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `Akun diblokir — ${loaderData?.branding.appName ?? 'Simple PM'}` },
    { name: 'robots', content: 'noindex' },
  ];
}

/**
 * Shown to a signed-in user whose account is banned (guards redirect here). Reads the
 * session itself, not the guards (anti-loop rule, P1 §2.3). No session → /login; a lifted
 * ban sends the account where its approval status says: pending/rejected → /waiting,
 * approved → /go (the role home is decided in one place).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect('/login');
  const kind = heldKindOf(session.user);
  if (kind === 'pending' || kind === 'rejected') throw redirect('/waiting');
  if (!kind) throw redirect('/go');
  return {
    ban: describeBan(session.user),
    email: session.user.email,
    branding: await getBranding(),
  };
}

export default function Banned({ loaderData }: Route.ComponentProps) {
  const { dateTime: formatDateTime, relative: formatRelative } = useTimeFormat();
  const { ban, email, branding } = loaderData;

  return (
    <HoldShell
      color="red"
      icon={<FiSlash size={28} />}
      title="Akun Anda diblokir"
      subtitle={`${email} tidak bisa memakai ${branding.appName} ${
        ban.permanent ? 'sampai pemblokiran dicabut admin.' : 'untuk sementara.'
      }`}
      actions={
        <>
          <HoldLeaveButton />
          <Button
            size="sm"
            variant="default"
            component={Link}
            to="/"
            leftSection={<FiHome size={14} />}
          >
            Ke beranda
          </Button>
        </>
      }
    >
      <Stack gap="md">
        <Alert
          color={ban.permanent ? 'red' : 'yellow'}
          variant="light"
          icon={<FiClock size={16} />}
          title={
            ban.permanent
              ? 'Pemblokiran permanen'
              : `Berakhir ${formatRelative(ban.until as string).replace('yang lalu', '')}`
          }
        >
          {ban.permanent
            ? 'Tidak ada tanggal berakhir. Akses kembali hanya bila admin mencabut pemblokiran.'
            : `Anda bisa masuk lagi setelah ${formatDateTime(ban.until as string)}. Sampai saat itu semua sesi ditolak.`}
        </Alert>

        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.3}>
            Alasan
          </Text>
          <Text size="sm">{ban.reason ?? 'Admin tidak mencantumkan alasan.'}</Text>
        </Stack>

        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.3}>
            Yang bisa Anda lakukan
          </Text>
          <Text size="sm">
            Bila menurut Anda ini keliru, hubungi dukungan dan sebutkan email akun Anda. Data Anda
            tidak dihapus; pemblokiran hanya menutup akses.
          </Text>
          {branding.supportUrl && (
            <Anchor href={branding.supportUrl} target="_blank" rel="noreferrer" size="sm">
              <Group gap={6} component="span">
                <FiLifeBuoy size={14} />
                Hubungi dukungan
              </Group>
            </Anchor>
          )}
        </Stack>
      </Stack>
    </HoldShell>
  );
}
