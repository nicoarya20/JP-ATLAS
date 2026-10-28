// What the More panel opens (prototype screens/home/home.more.jsx tiles): the secondary destinations, gated by what
// the server lets the caller do.
import type { Href } from 'expo-router';
import { Inbox, type LucideIcon, Settings, Trash2, UserCog, Users } from 'lucide-react-native';

import type { AppCapsWire } from '@/data/whoami.api';

export const MORE_PANEL = { label: 'More' } as const;

/**
 * Tile colour (prototype .mm-tile blue/green/orange/teal/gray). Atlas has no teal (its info is the same violet as
 * Inbox's), so Trash, which holds what was deleted, takes the danger pair: every tile reads apart.
 */
export type MoreTone = 'blue' | 'green' | 'orange' | 'red' | 'gray';

export type MoreTile = {
  /** Route it opens (registered in app/(tabs)/more/_layout.tsx). */
  path: Href;
  label: string;
  Icon: LucideIcon;
  tone: MoreTone;
  /** New items waiting there, drawn as a red count. */
  badge?: number;
};

/** The server's counts behind the badges; null while one is not in (no badge, never a guessed 0). */
export type MoreCounts = { inbox: number | null; pending: number | null };

/** The profile card opens the profile overlay (prototype profile.me, a root modal). */
export const PROFILE_PATH: Href = '/profile';

/**
 * The grid, in the prototype's order. Users is the Admin console's (`/api/admin`), so it shows only when whoami says
 * the caller may open the dashboard (`caps.dashboard`); until whoami is in, it stays hidden.
 */
export function moreTiles(caps: AppCapsWire | null, counts: MoreCounts): MoreTile[] {
  const tiles: (MoreTile | false)[] = [
    {
      path: '/more/inbox',
      label: 'Inbox',
      Icon: Inbox,
      tone: 'blue',
      badge: counts.inbox ?? undefined,
    },
    { path: '/more/team', label: 'Team', Icon: Users, tone: 'green' },
    caps?.dashboard === true && {
      path: '/more/users',
      label: 'Users',
      Icon: UserCog,
      tone: 'orange',
      badge: counts.pending ?? undefined,
    },
    { path: '/more/archive', label: 'Trash', Icon: Trash2, tone: 'red' },
    { path: '/more/settings', label: 'Settings', Icon: Settings, tone: 'gray' },
  ];
  return tiles.filter((t): t is MoreTile => t !== false);
}

/** Screen reader name of a tile: "Inbox, 3 new" when something waits there. */
export const tileLabel = (t: MoreTile) => (t.badge ? `${t.label}, ${t.badge} new` : t.label);
