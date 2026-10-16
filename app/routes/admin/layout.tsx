import { frameInfo } from '@server/app-info';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { getSidebarCollapsed } from '@server/sidebar';
import { adminSidebarBadges } from '@server/sidebar-badges';
import { FiGrid, FiHome, FiLayers, FiUser, FiUsers } from 'react-icons/fi';
import { Outlet } from 'react-router';
import { AppFrame, type NavItem } from '~/components/AppFrame';
import { AreaErrorBoundary } from '~/components/errors/AreaErrorBoundary';
import type { AppContext } from '~/lib/app-context';
import type { Route } from './+types/layout';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Admin — Simple PM' }];
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/dashboard/users', label: 'Pengguna', icon: FiUsers },
];
const APP: NavItem[] = [
  { to: '/app', label: 'App', icon: FiLayers },
  { to: '/app/settings', label: 'Pengaturan akun', icon: FiUser },
];

const SECONDARY: Record<string, NavItem[]> = {
  admin: APP,
  'super-admin': [{ to: '/dev', label: 'Dev Console', icon: FiGrid }, ...APP],
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
