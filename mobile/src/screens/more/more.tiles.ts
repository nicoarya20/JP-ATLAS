// What the More panel opens (prototype screens/home/home.more.jsx tiles): the secondary destinations, role-gated.
import type { Href } from 'expo-router';
import { Archive, Inbox, type LucideIcon, Settings, UserCog, Users } from 'lucide-react-native';

import { getProfile } from '@/data/profile';
import { type Role, USER_COUNTS } from '@/data/sample';

export const MORE_PANEL = { label: 'More' } as const;

/** Tile colour (prototype .mm-tile blue/green/orange/teal/gray). */
export type MoreTone = 'blue' | 'green' | 'orange' | 'teal' | 'gray';

export type MoreTile = {
  /** Route it opens (registered in app/(tabs)/more/_layout.tsx). */
  path: Href;
  label: string;
  Icon: LucideIcon;
  tone: MoreTone;
  /** New items waiting there, drawn as a red count. */
  badge?: number;
};

/** The profile card opens the profile overlay (prototype profile.me, a root modal). */
export const PROFILE_PATH: Href = '/profile';

/** The grid, in the prototype's order; Users is for Admin only. */
export function moreTiles(role: Role): MoreTile[] {
  const tiles: (MoreTile | false)[] = [
    {
      path: '/more/inbox',
      label: 'Inbox',
      Icon: Inbox,
      tone: 'blue',
      badge: getProfile(role).inbox,
    },
    { path: '/more/team', label: 'Team', Icon: Users, tone: 'green' },
    role === 'admin' && {
      path: '/more/users',
      label: 'Users',
      Icon: UserCog,
      tone: 'orange',
      badge: USER_COUNTS.pending,
    },
    { path: '/more/archive', label: 'Archive', Icon: Archive, tone: 'teal' },
    { path: '/more/settings', label: 'Settings', Icon: Settings, tone: 'gray' },
  ];
  return tiles.filter((t): t is MoreTile => t !== false);
}

/** Screen reader name of a tile: "Inbox, 3 new" when something waits there. */
export const tileLabel = (t: MoreTile) => (t.badge ? `${t.label}, ${t.badge} new` : t.label);
