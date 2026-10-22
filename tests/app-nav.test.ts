/**
 * Contract for the /app sidebar: exactly four entries, each pointing at a registered route, and
 * sub-pages keep their section lit. A NAV item with no route would be a dead link in the menu.
 */
import { describe, expect, it } from 'bun:test';
import { isNavActive, withBadges } from '../app/components/frame/nav';
import routes from '../app/routes';
import { NAV, NAV_GROUPS } from '../app/routes/app/layout';

type Entry = { path?: string; children?: Entry[] };

/** Absolute URL patterns of every route, joining nested paths (pathless layouts add nothing). */
function urlsOf(entries: Entry[], base = ''): string[] {
  return entries.flatMap((e) => {
    const here = e.path ? `${base}/${e.path}`.replace(/\/+/g, '/') : base;
    const own = e.path ? [here] : [];
    return [...own, ...urlsOf(e.children ?? [], here)];
  });
}

const REGISTERED = urlsOf(routes as Entry[]);
const byLabel = (label: string) => {
  const item = NAV.find((n) => n.label === label);
  if (!item) throw new Error(`NAV has no item "${label}"`);
  return item;
};

describe('/app NAV', () => {
  // Sampah joined with the project Trash page (S1-18, user decision 15 Oct 2026, option B).
  it('has exactly eight items in the agreed order', () => {
    expect(NAV.map((n) => [n.label, n.to])).toEqual([
      ['Beranda', '/app'],
      ['Inbox', '/app/inbox'],
      ['Proyek', '/app/projects'],
      ['Tugas', '/app/tasks'],
      ['Events', '/app/events'],
      ['Tim', '/app/team'],
      ['Sampah', '/app/trash'],
      ['Pengaturan', '/app/settings'],
    ]);
  });

  it.each([...NAV.map((n) => n.to)])('%s is a registered route', (to) => {
    expect(REGISTERED).toContain(to);
  });

  it('gives every item a one-sentence description for the tooltip', () => {
    for (const item of NAV) {
      expect(item.description?.trim().endsWith('.')).toBe(true);
    }
  });

  it('does not link to /profile (it stays a route, but Settings is the menu entry)', () => {
    expect(NAV.map((n) => n.to)).not.toContain('/profile');
  });
});

describe('Inbox badge', () => {
  const badgeOf = (groups: typeof NAV_GROUPS) =>
    groups.flatMap((g) => g.items).find((n) => n.to === '/app/inbox')?.badge;

  it('is not hard-coded in the NAV: the number comes from the live count', () => {
    expect(NAV.filter((n) => n.badge)).toEqual([]);
  });

  it('shows the open-card count when there is one and disappears at zero', () => {
    const live = (value: number) => ({ '/app/inbox': { value, tone: 'alert' as const } });
    expect(badgeOf(withBadges(NAV_GROUPS, live(4)))).toMatchObject({ value: 4, tone: 'alert' });
    expect(badgeOf(withBadges(NAV_GROUPS, live(0)))).toBeUndefined();
  });
});

describe('isNavActive for the /app NAV', () => {
  const active = (pathname: string) => NAV.filter((n) => isNavActive(pathname, n)).map((n) => n.to);

  it('lights Projects (only) for a project tab', () => {
    expect(active('/app/projects/abc/tasks')).toEqual(['/app/projects']);
  });

  it('lights Tasks for a task page and the new-task form', () => {
    expect(active('/app/tasks/12')).toEqual(['/app/tasks']);
    expect(active('/app/tasks/new')).toEqual(['/app/tasks']);
  });

  it('lights Home only on /app itself', () => {
    expect(active('/app')).toEqual(['/app']);
    expect(active('/app/projects')).toEqual(['/app/projects']);
  });

  it('does not match a sibling path that merely shares the prefix', () => {
    expect(isNavActive('/app/projectsx', byLabel('Proyek'))).toBe(false);
  });
});

describe('route registration helper (synthetic config)', () => {
  it('joins nested paths and skips pathless layouts', () => {
    const tree: Entry[] = [{ children: [{ path: 'app', children: [{ path: 'x/:id' }] }] }];
    expect(urlsOf(tree)).toEqual(['/app', '/app/x/:id']);
  });
});
