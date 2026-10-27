import {
  ActionIcon,
  Alert,
  Anchor,
  AppShell,
  Badge,
  Burger,
  Button,
  Divider,
  Group,
  ScrollArea,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Role } from '@server/permissions';
import type { ShellAnnouncement } from '@server/settings-announcement';
import type { Branding } from '@server/settings-branding';
import { type ReactNode, useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCornerUpLeft,
  FiInfo,
  FiTool,
  FiXOctagon,
  FiZap,
} from 'react-icons/fi';
import { Link } from 'react-router';
import type { AppUser } from '~/lib/app-context';
import { authClient, useSession } from '~/lib/auth-client';
import { BrandHeader } from './frame/BrandHeader';
import { NavList } from './frame/NavList';
import {
  homePath,
  type NavBadge,
  type NavGroup,
  type NavItem,
  normalizeNav,
  withBadges,
} from './frame/nav';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export type { NavBadge, NavGroup, NavItem } from './frame/nav';

// Written to cookie so the server can read it on next request (no SSR flash).
const COOKIE = 'mk-sidebar-collapsed';
// Wide enough for the brand name beside three 44 px header icons (bell, theme, collapse) in /app.
const WIDTH_EXPANDED = 296;
const WIDTH_COLLAPSED = 72;
/** Footer badge must never eat the name — short labels, full role in the tooltip. */
const ROLE_SHORT: Record<string, string> = {
  'super-admin': 'Super',
  admin: 'Admin',
  project_manager: 'PM',
  member: 'Anggota',
};

type Props = {
  /** Flat list or labeled groups. */
  navItems: NavItem[] | NavGroup[];
  role: Role;
  user: AppUser;
  badgeColor: string;
  children: ReactNode;
  /** Cross-area links ("other apps"), pinned below primary nav. */
  secondaryNav?: NavItem[];
  /** Area name shown under the brand and in the mobile header (e.g. "Dev Console"). */
  consoleLabel?: string;
  /** Live counters keyed by route path, resolved in the layout loader. */
  navBadges?: Record<string, NavBadge>;
  /** Notification bell: shown beside the theme toggle and in the mobile header; areas without one omit it. */
  bell?: ReactNode;
  env?: string;
  version?: string;
  /** App name/tagline from settings (defaults to Simple PM). */
  branding?: Branding;
  /** Show the maintenance banner to admins who can still use the app. */
  maintenance?: boolean;
  /** Office-wide announcement resolved by frameInfo(); null = nothing to show (AD-05). */
  announcement?: ShellAnnouncement | null;
  /**
   * Server-resolved initial collapsed state (read from cookie in the layout
   * loader). Lets the server render the correct sidebar width immediately,
   * preventing the expand→collapse flash on hard reload.
   */
  initialCollapsed?: boolean;
};

/**
 * Sidebar-only shell shared by every per-role area layout. Primary nav scrolls
 * in the grow section; cross-area links, theme toggle and the account switcher
 * are pinned to the bottom. Collapse state lives in a cookie so the server
 * renders the right width on hard reload.
 */
export function AppFrame(props: Props) {
  const {
    role,
    user,
    badgeColor,
    children,
    consoleLabel,
    env,
    version,
    branding,
    maintenance,
    announcement,
    bell,
    initialCollapsed = false,
  } = props;
  const appName = branding?.appName ?? 'Simple PM';
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  // Initialized from server-resolved value — no useEffect needed, no flash.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const { data } = useSession();
  const impersonating = Boolean(
    (data?.session as { impersonatedBy?: string } | undefined)?.impersonatedBy,
  );
  const groups = withBadges(normalizeNav(props.navItems), props.navBadges);
  const secondary = normalizeNav(props.secondaryNav);
  const home = homePath(groups);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      // Cookie persists across hard reloads; server reads it in layout loaders.
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is async/Promise-based; document.cookie is intentional for synchronous set.
      document.cookie = `${COOKIE}=${next ? '1' : '0'};path=/;max-age=${365 * 24 * 3600};SameSite=Lax`;
      return next;
    });
  }

  async function stopImpersonating() {
    await authClient.admin.stopImpersonating();
    window.location.assign('/go');
  }

  return (
    <AppShell
      header={{ height: { base: 52, sm: 0 } }}
      navbar={{
        width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      {/* Mobile-only top header — provides space + burger so content never overlaps */}
      <AppShell.Header withBorder={false} hiddenFrom="sm">
        <Group h="100%" px="md" gap="sm" wrap="nowrap">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            size="sm"
            aria-label="Buka navigasi"
          />
          <Link to={home} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <FiZap size="1.25em" />
              <Text fw={700} truncate>
                {appName}
              </Text>
              {consoleLabel && (
                <Text size="xs" c="dimmed" truncate>
                  · {consoleLabel}
                </Text>
              )}
            </Group>
          </Link>
          {bell && <div style={{ marginLeft: 'auto', flexShrink: 0 }}>{bell}</div>}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section>
          <BrandHeader
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            homePath={home}
            consoleLabel={consoleLabel}
            env={env}
            version={version}
            extra={
              <>
                {bell}
                <ThemeToggle collapsed />
              </>
            }
            appName={appName}
          />
        </AppShell.Section>

        {impersonating && (
          <AppShell.Section mt="sm">
            {collapsed ? (
              <Tooltip label="Berhenti impersonasi" position="right" withArrow>
                <ActionIcon
                  variant="light"
                  color="orange"
                  size="lg"
                  mx="auto"
                  display="block"
                  onClick={stopImpersonating}
                  aria-label="Berhenti impersonasi"
                >
                  <FiCornerUpLeft size="1.25em" />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Button
                fullWidth
                size="xs"
                variant="light"
                color="orange"
                leftSection={<FiCornerUpLeft size="1.25em" />}
                onClick={stopImpersonating}
              >
                Berhenti impersonasi
              </Button>
            )}
          </AppShell.Section>
        )}

        <AppShell.Section
          grow
          my="md"
          component={ScrollArea}
          type="hover"
          scrollbarSize={6}
          offsetScrollbars={false}
        >
          <NavList groups={groups} collapsed={collapsed} onNavigate={closeMobile} />
        </AppShell.Section>

        {secondary.length > 0 && (
          <AppShell.Section mb="sm">
            <Divider mb="sm" />
            <NavList
              groups={[{ label: collapsed ? undefined : 'Area lain', items: secondary[0].items }]}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          </AppShell.Section>
        )}

        <AppShell.Section>
          <Divider mb={4} />
          <UserMenu
            user={user}
            collapsed={collapsed}
            roleBadge={
              <Tooltip label={`Role: ${role}`} withArrow>
                <Badge size="xs" variant="light" color={badgeColor} style={{ flexShrink: 0 }}>
                  {ROLE_SHORT[role] ?? role}
                </Badge>
              </Tooltip>
            }
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* Announcement first: it is the office-wide message every signed-in reader is meant to
            see (and may be pinned unmissable), while the maintenance banner below is an operational
            note shown only to the privileged roles who can still use the console. */}
        {announcement && <AnnouncementBanner announcement={announcement} />}
        {maintenance && (
          <Alert
            color="orange"
            variant="filled"
            icon={<FiTool size="1.25em" />}
            mb="md"
            title="Mode maintenance aktif"
          >
            Pengunjung biasa melihat halaman pemeliharaan. Anda tetap bisa memakai konsol.{' '}
            <Anchor c="white" underline="always" component={Link} to="/dev/settings">
              Matikan di Settings
            </Anchor>
          </Alert>
        )}
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

/** localStorage key holding the signature of the announcement this reader has already closed. */
const ANNOUNCEMENT_DISMISS_KEY = 'mk-announcement-dismissed';

/** Tone → Mantine colour (role-aliased) + icon; the three levels of settings-announcement.ts. */
const ANNOUNCEMENT_TONE: Record<ShellAnnouncement['level'], { color: string; Icon: typeof FiInfo }> = {
  info: { color: 'blue', Icon: FiInfo },
  warn: { color: 'yellow', Icon: FiAlertTriangle },
  danger: { color: 'red', Icon: FiXOctagon },
};

/**
 * A stable short signature of an announcement's content (djb2 → base36). A reader's dismissal is
 * remembered against this, so editing the text or the tone brings the banner back for everyone —
 * the "muncul lagi sampai isinya diubah" rule — without needing a server-side per-reader record.
 */
export function announcementSignature(a: Pick<ShellAnnouncement, 'text' | 'level'>): string {
  const input = `${a.level}:${a.text}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/**
 * Office-wide banner shown in every signed-in area (never on landing/login, which do not render
 * AppFrame). Dismissal is per-reader and per-content: it lives in localStorage, so it survives
 * reloads on this device only and resets the moment the announcement changes. A non-dismissible
 * banner (past its `dismissibleUntil`) carries no close button and ignores any stored dismissal.
 */
function AnnouncementBanner({ announcement }: { announcement: ShellAnnouncement }) {
  const signature = announcementSignature(announcement);
  // Starts shown so SSR and the first client render agree (no hydration mismatch); the effect then
  // hides it if this reader had already closed this exact content.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!announcement.dismissible) return;
    try {
      setDismissed(localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) === signature);
    } catch {
      // Private mode or blocked storage: show the banner rather than throw.
    }
  }, [signature, announcement.dismissible]);

  if (announcement.dismissible && dismissed) return null;
  const { color, Icon } = ANNOUNCEMENT_TONE[announcement.level] ?? ANNOUNCEMENT_TONE.info;
  return (
    <Alert
      color={color}
      variant="light"
      radius="md"
      mb="md"
      icon={<Icon size="1.25em" aria-hidden />}
      withCloseButton={announcement.dismissible}
      closeButtonLabel="Tutup pengumuman"
      onClose={() => {
        try {
          localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, signature);
        } catch {
          // Ignore: a failed write just means the banner reappears on the next load.
        }
        setDismissed(true);
      }}
    >
      {announcement.text}
    </Alert>
  );
}
