import { Stack } from '@mantine/core';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { EksporDataPanel } from '~/components/admin/export/ekspor-data';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/export';

export const EXPORT_PAGE_COPY = {
  title: 'Ekspor data',
  description: 'Alat unduhan: ambil data anggota, proyek, atau tugas sebagai berkas CSV.',
} as const;

export function meta() {
  return [{ title: 'Ekspor data — Simple PM' }];
}

/**
 * /dashboard/export (P11 AD-10): the CSV downloads as a menu of their own. They left Pengaturan in
 * AD-20 because this is a tool, not a setting — pressing a card produces a file instead of saving
 * a value. The guard is repeated here on purpose: React Router runs the layout and page loaders in
 * parallel, so the layout guard does not cover this page's data.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  return null;
}

export default function AdminExportPage() {
  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <PageHeader title={EXPORT_PAGE_COPY.title} description={EXPORT_PAGE_COPY.description} />
      <EksporDataPanel />
    </Stack>
  );
}
