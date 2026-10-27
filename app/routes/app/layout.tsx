import { type AppCaps, appCaps } from '@server/access/capabilities';
import { frameInfo } from '@server/app-info';
import { requireUser } from '@server/guard';
import { bellCounts } from '@server/notification/notification.bell';
import { toPrincipal } from '@server/project/membership.query';
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
import { BELL_COPY } from '~/components/inbox/inbox.copy';
import { NotificationBell } from '~/components/inbox/NotificationBell';
import type { AppContext } from '~/lib/app-context';
import { INBOX_PATH } from '~/lib/inbox-api';
import { useInboxCounts } from '~/lib/use-inbox';
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

/**
 * "Area lain": the three areas minus the one open here (App), always in the order App, Admin,
 * Super-admin. Which entries appear comes from the server's capability map, never from a role
 * comparison in the UI (X3 M29). Account settings belong to the person, not an area, so they sit
 * in the avatar menu (UserMenu).
 */
export function secondaryNav(caps: AppCaps): NavItem[] {
  return [
    ...(caps.dashboard ? [{ to: '/dashboard', label: 'Admin', icon: FiHome }] : []),
    ...(caps.dev ? [{ to: '/dev', label: 'Super-admin', icon: FiGrid }] : []),
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
  const loadedAt = Date.now();
  const [counts, info] = await Promise.all([bellCounts(toPrincipal(auth)), frameInfo()]);
  return {
    ...auth,
    caps,
    collapsed: getSidebarCollapsed(request),
    inbox: { counts, loadedAt },
    ...info,
  };
}

function Frame({
  data,
  children,
}: {
  data: Route.ComponentProps['loaderData'];
  children: React.ReactNode;
}) {
  // The loader's numbers are the first render; the hook then polls, so bell and badge never disagree.
  const open = useInboxCounts(data.inbox).data?.action ?? 0;
  return (
    <AppFrame
      navItems={NAV_GROUPS}
      navBadges={{
        [INBOX_PATH]: {
          value: open,
          color: 'red',
          tone: 'alert',
          tooltip: BELL_COPY.badgeTooltip(open),
        },
      }}
      bell={<NotificationBell count={open} />}
      secondaryNav={secondaryNav(data.caps)}
      role={data.role}
      user={data.user}
      badgeColor={BADGE_COLOR[data.role] ?? 'gray'}
      env={data.env}
      branding={data.branding}
      maintenance={data.maintenance}
      announcement={data.announcement}
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
