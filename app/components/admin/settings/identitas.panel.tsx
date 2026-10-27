/**
 * Pengaturan › Identitas, for real (P13 RD-03). The backend was complete all along — this is the
 * same `BrandingCard` that /dev/settings uses, against the same `PUT /api/settings/branding`; the
 * only thing missing was RD-02 letting an Admin write it.
 *
 * Values come from the page loader (one cached settings row, server-rendered so the form never
 * flashes empty) rather than react-query, because `GET /api/settings/all` stays super-admin: an
 * Admin may write this group but may not read the whole settings overview. Saving revalidates the
 * loader, which repaints the sidebar and the tab title too — they read the same row.
 */
import { Alert } from '@mantine/core';
import { FiAlertCircle } from 'react-icons/fi';
import { useRevalidator, useRouteLoaderData } from 'react-router';
import { BrandingCard } from '~/components/settings/BrandingCard';
import type { Branding, BrandingSettings } from '~/lib/settings-api';

/** What the Pengaturan loader hands this panel. Imported by the route, so the shape cannot drift. */
export type IdentitasData = { settings: BrandingSettings; defaults: Branding };

/** Route id of app/routes/admin/settings.tsx — the page that owns the loader. */
const SETTINGS_ROUTE_ID = 'routes/admin/settings';

export function IdentitasPanel() {
  const revalidator = useRevalidator();
  const branding = useRouteLoaderData<{ branding: IdentitasData }>(SETTINGS_ROUTE_ID)?.branding;

  // Only reachable if the panel is ever rendered outside its page; an empty form that silently
  // saves nothing would be worse than saying so.
  if (!branding)
    return (
      <Alert color="red" icon={<FiAlertCircle size="1.25em" />} title="Identitas belum bisa dimuat">
        Setelan identitas tidak terbaca dari halaman ini. Muat ulang halaman Pengaturan.
      </Alert>
    );

  return (
    <BrandingCard
      settings={branding.settings}
      defaults={branding.defaults}
      onSaved={() => revalidator.revalidate()}
    />
  );
}
