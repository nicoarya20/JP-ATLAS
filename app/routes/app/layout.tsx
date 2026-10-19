import { type AppCaps, appCaps } from '@server/access/capabilities';
import { frameInfo } from '@server/app-info';
import { requireUser } from '@server/guard';
import { getSidebarCollapsed } from '@server/sidebar';
import {
  FiBell,
  FiCalendar,
  FiCheckSquare,
  FiFolder,
  FiGrid,
  FiHome,
  FiSettings,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { Outlet } from 'react-router';
import { AppFrame, type NavGroup, type NavItem } from '~/components/AppFrame';
import { AreaErrorBoundary } from '~/components/errors/AreaErrorBoundary';
import { NEEDS_ACTION } from '~/components/inbox/inbox.dummy';
import type { AppContext } from '~/lib/app-context';
import type { Route } from './+types/layout';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Simple PM' }];
}

// Order is the sidebar order; the second group sits under a divider. Projects, tasks and the rest
// keep their sub-pages highlighted via matchPrefix; Home stays exact so it is not lit on every /app/* page.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        to: '/app',
        label: 'Beranda',
        icon: FiHome,
        description: 'Ringkasan pekerjaan Anda hari ini.',
      },
      {
        to: '/app/inbox',
        label: 'Inbox',
        icon: FiBell,
        matchPrefix: true,
        // DUMMY: jumlah dari data contoh Inbox; ganti dengan hitungan server saat modul notifikasi dibuat.
        badge: {
          value: NEEDS_ACTION.length,
          tone: 'alert',
          tooltip: 'Permintaan yang perlu Anda tanggapi.',
        },
        description: 'Notifikasi dan permintaan untuk Anda.',
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
        to: '/app/events',
        label: 'Events',
        icon: FiCalendar,
        matchPrefix: true,
        description: 'Jadwal rapat dan acara tim.',
      },
      {
        to: '/app/team',
        label: 'Tim',
        icon: FiUsers,
        matchPrefix: true,
        description: 'Anggota tim dan beban kerjanya.',
      },
    ],
  },
  {
    items: [
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
    ],
  },
];

/** Flat view of NAV_GROUPS, for tests and anything that only needs the links. */
export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

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
      navItems={NAV_GROUPS}
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
