/**
 * Contract for the "Area lain" switcher (P11 AD-01): in every area the group holds exactly the
 * three areas — App, Admin, Super-admin — minus the one being viewed, with `Admin` reserved for
 * admin + super-admin and `Super-admin` for super-admin only. `Pengaturan akun` is personal, not
 * an area, so it must have left the group for the avatar menu.
 */
import { describe, expect, it } from 'bun:test';
import { ACCOUNT_SETTINGS } from '../app/components/UserMenu';
import routes from '../app/routes';
import { SECONDARY } from '../app/routes/admin/layout';
import { secondaryNav } from '../app/routes/app/layout';
import { OTHER } from '../app/routes/super/layout';
import { appCaps } from '../server/access/capabilities';
import type { Principal } from '../server/access/types';
import { ROLES } from '../server/permissions';

type Entry = { path?: string; children?: Entry[] };
type Pair = [label: string, to: string];

const APP_AREA: Pair = ['App', '/app'];
const ADMIN_AREA: Pair = ['Admin', '/dashboard'];
const SUPER_AREA: Pair = ['Super-admin', '/dev'];
/** Every entry the switcher may ever show, in the one agreed order. */
const ALL_AREAS: Pair[] = [APP_AREA, ADMIN_AREA, SUPER_AREA];

const pairs = (items: { label: string; to: string }[]): Pair[] => items.map((i) => [i.label, i.to]);

const principal = (appRole: Principal['appRole']): Principal => ({
  id: 'u-1',
  appRole,
  impersonating: false,
});
/** The /app sidebar builds its group from the server's capability map, as the loader does. */
const appArea = (appRole: Principal['appRole']) => pairs(secondaryNav(appCaps(principal(appRole))));

/** Absolute URL patterns of every registered route, joining nested paths. */
function urlsOf(entries: Entry[], base = ''): string[] {
  return entries.flatMap((e) => {
    const here = e.path ? `${base}/${e.path}`.replace(/\/+/g, '/') : base;
    return [...(e.path ? [here] : []), ...urlsOf(e.children ?? [], here)];
  });
}
const REGISTERED = urlsOf(routes as Entry[]);

describe('"Area lain" in /dashboard (Admin)', () => {
  it('shows App only, for an admin', () => {
    expect(pairs(SECONDARY[ROLES.ADMIN])).toEqual([APP_AREA]);
  });

  it('adds Super-admin, for a super-admin', () => {
    expect(pairs(SECONDARY[ROLES.SUPER_ADMIN])).toEqual([APP_AREA, SUPER_AREA]);
  });

  it('is defined for admin-level roles only', () => {
    expect(Object.keys(SECONDARY).sort()).toEqual([ROLES.ADMIN, ROLES.SUPER_ADMIN].sort());
  });
});

describe('"Area lain" in /dev (Super-admin)', () => {
  it('shows App and Admin, never a deep link into either', () => {
    expect(pairs(OTHER)).toEqual([APP_AREA, ADMIN_AREA]);
  });

  it('no longer links to the approval queue (its badge stays on the Admin Pengguna menu)', () => {
    expect(OTHER.map((i) => i.to)).not.toContain('/dashboard/users');
  });
});

describe('"Area lain" in /app', () => {
  it('is empty for a member and a project manager: they own no other area', () => {
    expect(appArea(ROLES.MEMBER)).toEqual([]);
    expect(appArea(ROLES.PROJECT_MANAGER)).toEqual([]);
  });

  it('shows Admin for an admin and both for a super-admin', () => {
    expect(appArea(ROLES.ADMIN)).toEqual([ADMIN_AREA]);
    expect(appArea(ROLES.SUPER_ADMIN)).toEqual([ADMIN_AREA, SUPER_AREA]);
  });
});

describe('every area group', () => {
  const groups: Record<string, Pair[]> = {
    'dashboard/admin': pairs(SECONDARY[ROLES.ADMIN]),
    'dashboard/super-admin': pairs(SECONDARY[ROLES.SUPER_ADMIN]),
    dev: pairs(OTHER),
    'app/member': appArea(ROLES.MEMBER),
    'app/admin': appArea(ROLES.ADMIN),
    'app/super-admin': appArea(ROLES.SUPER_ADMIN),
  };

  it.each(Object.entries(groups))('%s draws only from the three areas, in order', (_name, got) => {
    expect(ALL_AREAS.filter((a) => got.some(([, to]) => to === a[1]))).toEqual(got);
  });

  it.each(Object.entries(groups))('%s never repeats the area it is shown in', (name, got) => {
    const own = name.startsWith('app') ? '/app' : name.startsWith('dev') ? '/dev' : '/dashboard';
    expect(got.map(([, to]) => to)).not.toContain(own);
  });

  it.each(Object.entries(groups))('%s drops Pengaturan akun', (_name, got) => {
    expect(got.map(([label]) => label)).not.toContain(ACCOUNT_SETTINGS.label);
    expect(got.map(([, to]) => to)).not.toContain(ACCOUNT_SETTINGS.to);
  });

  it.each([...ALL_AREAS, [ACCOUNT_SETTINGS.label, ACCOUNT_SETTINGS.to] as Pair])(
    '%s points at the registered route %s',
    (_label, to) => {
      expect(REGISTERED).toContain(to);
    },
  );
});
