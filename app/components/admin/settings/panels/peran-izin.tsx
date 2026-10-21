/**
 * "Peran & izin" tab of /dashboard/settings (P11 AD-09): the role × capability matrix, read only
 * for everyone — roles are changed from the Pengguna menu, and the matrix itself follows the code.
 *
 * The data is fetched here, not in the page loader: the page keeps `?tab=` switching free of
 * revalidation, so a loader fetch would pull every tab's data on every visit.
 */
import { Alert, Anchor, Button, Group, Skeleton, Stack, Text } from '@mantine/core';
import type { PermissionsMatrix } from '@server/access/permissions-matrix';
import { useQuery } from '@tanstack/react-query';
import { FiAlertCircle, FiShield } from 'react-icons/fi';
import { Link } from 'react-router';
import { EmptyState } from '~/components/ui/EmptyState';
import { client } from '~/lib/eden';
import { ApiError, describeApiError } from '~/lib/http';
import { PermissionsMatrixView } from './peran-izin.view';

export const PERAN_IZIN_COPY = {
  intro:
    'Tabel ini dibaca langsung dari aturan izin di kode aplikasi, jadi isinya selalu sama dengan yang berlaku di server.',
  readOnly: 'Halaman ini hanya bisa dibaca. Peran tiap orang diubah di menu',
  usersLink: 'Pengguna',
  failedTitle: 'Gagal memuat matriks peran',
  retry: 'Coba lagi',
  emptyTitle: 'Belum ada kemampuan yang terdaftar',
  emptyDescription:
    'Aturan izin belum menyebut satu kemampuan pun. Hubungi Super-admin bila tabel ini kosong.',
} as const;

const SKELETON_KEYS = ['s0', 's1', 's2', 's3'];
export const PERMISSIONS_MATRIX_QUERY_KEY = ['admin-permissions-matrix'] as const;

/** Reads the matrix through Eden and turns any refusal into the app's uniform `ApiError`. */
export async function fetchPermissionsMatrix(): Promise<PermissionsMatrix> {
  const { data, error } = await client.api.admin['permissions-matrix'].get();
  if (error) {
    const body = (error.value ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
    throw new ApiError({
      message: str(body.error),
      status: typeof error.status === 'number' ? error.status : 0,
      code: str(body.code),
      requestId: str(body.requestId),
    });
  }
  return data;
}

export function PeranIzinPanel() {
  const matrix = useQuery({
    queryKey: PERMISSIONS_MATRIX_QUERY_KEY,
    queryFn: fetchPermissionsMatrix,
  });

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          {PERAN_IZIN_COPY.intro}
        </Text>
        <Text size="sm" c="dimmed">
          {`${PERAN_IZIN_COPY.readOnly} `}
          <Anchor component={Link} to="/dashboard/users" size="sm">
            {PERAN_IZIN_COPY.usersLink}
          </Anchor>
          .
        </Text>
      </Stack>

      {matrix.isError && (
        <Alert
          color="red"
          icon={<FiAlertCircle size="1.25em" aria-hidden />}
          title={PERAN_IZIN_COPY.failedTitle}
        >
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="sm">{describeApiError(matrix.error)}</Text>
            <Button
              size="sm"
              variant="light"
              color="red"
              loading={matrix.isFetching}
              onClick={() => matrix.refetch()}
            >
              {PERAN_IZIN_COPY.retry}
            </Button>
          </Group>
        </Alert>
      )}

      {matrix.isPending && (
        <Stack gap="xs">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} h={56} radius="md" />
          ))}
        </Stack>
      )}

      {matrix.data && matrix.data.capabilities.length === 0 && (
        <EmptyState
          icon={FiShield}
          title={PERAN_IZIN_COPY.emptyTitle}
          description={PERAN_IZIN_COPY.emptyDescription}
        />
      )}

      {matrix.data && matrix.data.capabilities.length > 0 && (
        <PermissionsMatrixView matrix={matrix.data} />
      )}
    </Stack>
  );
}
