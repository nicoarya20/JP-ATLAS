import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { type AccountStatusFields, heldKindOf } from '@server/account/status';
import { auth } from '@server/auth';
import { getBranding } from '@server/settings-branding';
import { useEffect, useRef } from 'react';
import { FiAlertCircle, FiClock, FiLifeBuoy, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { redirect, useRevalidator } from 'react-router';
import { HoldLeaveButton, HoldShell } from '~/components/account/HoldShell';
import type { Route } from './+types/waiting';

const FALLBACK_APP_NAME = 'Simple PM';
const NO_REASON_TEXT = 'Admin tidak mencantumkan alasan.';

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.branding.appName ?? FALLBACK_APP_NAME;
  const title = loaderData?.kind === 'rejected' ? 'Pendaftaran ditolak' : 'Menunggu persetujuan';
  return [{ title: `${title} — ${name}` }, { name: 'robots', content: 'noindex' }];
}

/**
 * Shown to a signed-in account whose approval is pending or rejected (guards redirect here).
 * Reads the session itself instead of going through the guards, which would bounce a held
 * account straight back here (anti-loop rule, P1 §2.3). No session → /login, banned →
 * /banned, approved → /go (so the role home is decided in one place).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect('/login');
  const kind = heldKindOf(session.user as AccountStatusFields);
  if (kind === 'banned') throw redirect('/banned');
  if (!kind) throw redirect('/go');
  return {
    kind,
    email: session.user.email,
    reason: session.user.approvalReason?.trim() || null,
    branding: await getBranding(),
  };
}

export default function Waiting({ loaderData }: Route.ComponentProps) {
  const { kind, email, reason, branding } = loaderData;
  const revalidator = useRevalidator();
  // The check resolves after the loader may have redirected away (approved) or flipped
  // the state; only tell the user "still waiting" when this page is still the same view.
  const mounted = useRef(true);
  const kindRef = useRef(kind);
  kindRef.current = kind;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const recheck = async () => {
    const before = kind;
    try {
      await revalidator.revalidate();
    } catch {
      notifications.show({ color: 'red', message: 'Gagal memeriksa akun. Coba lagi.' });
      return;
    }
    if (mounted.current && kindRef.current === before) {
      notifications.show({
        color: 'blue',
        message:
          before === 'pending'
            ? 'Akun Anda masih menunggu persetujuan.'
            : 'Status akun Anda belum berubah.',
      });
    }
  };

  const rejected = kind === 'rejected';
  return (
    <HoldShell
      color={rejected ? 'red' : 'yellow'}
      icon={rejected ? <FiXCircle size={28} /> : <FiClock size={28} />}
      title={rejected ? 'Pendaftaran Anda ditolak' : 'Akun Anda menunggu persetujuan'}
      subtitle={email}
      actions={
        <>
          <Button
            size="sm"
            variant="default"
            leftSection={<FiRefreshCw size={14} />}
            loading={revalidator.state === 'loading'}
            onClick={recheck}
          >
            Cek lagi
          </Button>
          <HoldLeaveButton />
        </>
      }
    >
      {rejected ? (
        <Stack gap="md">
          <Alert
            color="red"
            variant="light"
            icon={<FiAlertCircle size={16} />}
            title="Alasan dari Admin"
          >
            {reason ?? NO_REASON_TEXT}
          </Alert>
          <Stack gap={2}>
            <Text size="sm">
              Bila menurut Anda ini keliru, hubungi dukungan dan sebutkan email Anda di atas.
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
      ) : (
        <Stack gap="xs">
          <Text size="sm">
            Admin sedang memeriksa pendaftaran Anda. Sampai disetujui, Anda belum bisa memakai{' '}
            {branding.appName}.
          </Text>
          <Text size="sm">
            Anda tidak perlu berbuat apa-apa. Tekan "Cek lagi" untuk melihat apakah akun sudah
            disetujui.
          </Text>
        </Stack>
      )}
    </HoldShell>
  );
}
