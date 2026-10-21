import { Stack, Text, Title } from '@mantine/core';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { PeranIzinPanel } from '~/components/admin/permissions/peran-izin';
import type { Route } from './+types/permissions';

export const PERMISSIONS_PAGE_COPY = {
  title: 'Peran & izin',
  description:
    'Laporan baca-saja: peran apa saja yang ada dan apa yang boleh dilakukan masing-masing.',
} as const;

export function meta() {
  return [{ title: 'Peran & izin — Simple PM' }];
}

/**
 * /dashboard/permissions (P11 AD-09): the role × capability matrix as a menu of its own. It left
 * Pengaturan in AD-20 because it is a report, not a setting — nothing here is changed and saved.
 * The guard is repeated here on purpose: React Router runs the layout and page loaders in
 * parallel, so the layout guard does not cover this page's data.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  return null;
}

export default function AdminPermissionsPage() {
  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <div>
        <Title order={1}>{PERMISSIONS_PAGE_COPY.title}</Title>
        <Text size="sm" c="dimmed">
          {PERMISSIONS_PAGE_COPY.description}
        </Text>
      </div>
      <PeranIzinPanel />
    </Stack>
  );
}
