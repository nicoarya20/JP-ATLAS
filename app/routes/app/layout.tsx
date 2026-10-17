import { type AppCaps, appCaps } from '@server/access/capabilities';
import { frameInfo } from '@server/app-info';
import { requireUser } from '@server/guard';
import { getSidebarCollapsed } from '@server/sidebar';
import { FiCheckSquare, FiFolder, FiGrid, FiHome, FiSettings, FiTrash2 } from 'react-icons/fi';
import { Outlet } from 'react-router';
import { AppFrame, type NavItem } from '~/components/AppFrame';
import { AreaErrorBoundary } from '~/components/errors/AreaErrorBoundary';
import type { AppContext } from '~/lib/app-context';
import type { Route } from './+types/layout';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Simple PM' }];
}

// Order is the sidebar order. Projects and tasks keep their sub-pages (/app/projects/:id/tasks)
// highlighted via matchPrefix; Home stays exact so it is not lit on every /app/* page.
export const NAV: NavItem[] = [
  {
    to: '/app',
    label: 'Beranda',
    icon: FiHome,
    description: 'Ringkasan pekerjaan Anda hari ini.',
  },
  {
    to: '/app/projects',
    label: 'Proyek',
    icon: FiFolder,
    matchPrefix: true,
    description: 'Daftar proyek yang Anda ikuti.',
  },
  {
    to: '/app/tasks',
    label: 'Tugas',
    icon: FiCheckSquare,
    matchPrefix: true,
    description: 'Daftar tugas yang perlu dikerjakan.',
  },
  {
    to: '/app/trash',
    label: 'Sampah',
    icon: FiTrash2,
    description: 'Proyek yang dihapus dan masih bisa dipulihkan.',
  },
  {
    to: '/app/settings',
    label: 'Pengaturan',
    icon: FiSettings,
    description: 'Atur profil dan tampilan akun Anda.',
  },
];

/** Links to the other areas the signed-in account may open; Dev first for the super-admin. */
function secondaryNav(caps: AppCaps): NavItem[] {
  return [
    ...(caps.dev ? [{ to: '/dev', label: 'Dev Console', icon: FiGrid }] : []),
    ...(caps.dashboard ? [{ to: '/dashboard', label: 'Dashboard', icon: FiHome }] : []),
  ];
}

const BADGE_COLOR: Record<string, string> = {
  member: 'gray',
  project_manager: 'teal',
  admin: 'blue',
  'super-admin': 'grape',
};

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireUser(request);
  // Cross-area links come from the server's capability map, so the UI never compares a role (X3 M29).
  const caps = appCaps({
    id: auth.user.id,
    appRole: auth.role,
    impersonating: Boolean(auth.impersonatedBy),
  });
  return { ...auth, caps, collapsed: getSidebarCollapsed(request), ...(await frameInfo()) };
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
      secondaryNav={secondaryNav(data.caps)}
      role={data.role}
      user={data.user}
      badgeColor={BADGE_COLOR[data.role] ?? 'gray'}
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

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const ctx: AppContext = { user: loaderData.user, role: loaderData.role };
  return (
    <Frame data={loaderData}>
      <Outlet context={ctx} />
    </Frame>
  );
}

export function ErrorBoundary({ error, loaderData }: Route.ErrorBoundaryProps) {
  return (
    <AreaErrorBoundary error={error} homePath="/app" homeLabel="Ke app">
      {loaderData ? (node) => <Frame data={loaderData}>{node}</Frame> : undefined}
    </AreaErrorBoundary>
  );
}
