import { frameInfo } from '@server/app-info';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { getSidebarCollapsed } from '@server/sidebar';
import { adminSidebarBadges } from '@server/sidebar-badges';
import {
  FiActivity,
  FiDownload,
  FiGrid,
  FiHome,
  FiLayers,
  FiSettings,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { Outlet } from 'react-router';
import { AppFrame, type NavItem } from '~/components/AppFrame';
import { AreaErrorBoundary } from '~/components/errors/AreaErrorBoundary';
import type { AppContext } from '~/lib/app-context';
import type { Route } from './+types/layout';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Admin — Simple PM' }];
}

/**
 * Admin menu, in reading order. Peran & izin and Ekspor data stand on their own since AD-20 (user
 * decision 21 Oct 2026): a report and a tool are not settings, and eight tabs did not fit a
 * 1366px laptop. Proyek and Aktivitas join later (AD-12, AD-18).
 */
export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/dashboard/users', label: 'Pengguna', icon: FiUsers },
  { to: '/dashboard/activity', label: 'Aktivitas', icon: FiActivity },
  { to: '/dashboard/permissions', label: 'Peran & izin', icon: FiShield },
  { to: '/dashboard/export', label: 'Ekspor data', icon: FiDownload },
  { to: '/dashboard/settings', label: 'Pengaturan', icon: FiSettings },
];

// "Area lain" lists the three areas minus the one open here (Admin), always in the same order:
// App, Admin, Super-admin. Account settings belong to the person, not an area, so they sit in the
// avatar menu (UserMenu) instead.
const APP: NavItem[] = [{ to: '/app', label: 'App', icon: FiLayers }];

export const SECONDARY: Record<string, NavItem[]> = {
  admin: APP,
  'super-admin': [...APP, { to: '/dev', label: 'Super-admin', icon: FiGrid }],
};

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  // Pending-approval count only — soft-fails to no badge, so the Admin menu never breaks.
  const navBadges = await adminSidebarBadges();
  return { ...auth, collapsed: getSidebarCollapsed(request), navBadges, ...(await frameInfo()) };
}

function Frame({
  data,
  children,
}: {
  data: Route.ComponentProps['loaderData'];
  children: React.ReactNode;
}) {
  return (
    <AppFrame
      navItems={NAV}
      navBadges={data.navBadges}
      secondaryNav={SECONDARY[data.role]}
      role={data.role}
      user={data.user}
      badgeColor="blue"
      consoleLabel="Admin"
      env={data.env}
      branding={data.branding}
      maintenance={data.maintenance}
      version={data.version}
      initialCollapsed={data.collapsed}
    >
      {children}
    </AppFrame>
  );
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const ctx: AppContext = { user: loaderData.user, role: loaderData.role };
  return (
    <Frame data={loaderData}>
      <Outlet context={ctx} />
    </Frame>
  );
}

export function ErrorBoundary({ error, loaderData }: Route.ErrorBoundaryProps) {
  return (
    <AreaErrorBoundary error={error} homePath="/dashboard" homeLabel="Ke dashboard">
      {loaderData ? (node) => <Frame data={loaderData}>{node}</Frame> : undefined}
    </AreaErrorBoundary>
  );
}
