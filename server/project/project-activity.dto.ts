/**
 * Wire shape and sentences of the project activity feed (S5a-03). Pure and browser-safe (no DB
 * import). The sentence is built here, in Indonesian, so the Summary card, the API and a future
 * mobile client all read the same words. An action nobody taught this file about still gets a safe
 * generic sentence: history written by a newer version must never break an older reader.
 */
import type { ProjectCondition, ProjectMemberRole, ProjectStatus } from '../pm/enums';

export type ActivityItemDto = {
  id: string;
  /** Raw action name such as `deadline.extended`; clients may pick an icon from it. */
  action: string;
  /** Ready-to-show sentence, e.g. "Nico memperpanjang tenggat 15 Okt → 31 Okt". */
  text: string;
  actorId: string | null;
  /** Name as shown; "<name> (akun dihapus)" once the account is gone, null when no name was ever kept. */
  actorName: string | null;
  createdAt: string; // ISO instant
};

export type ActivityRow = {
  id: string;
  action: string;
  payload: unknown;
  actorId: string | null;
  actorName: string | null;
  createdAt: Date;
};

// Same words as `app/lib/pm-labels.ts` and `projects.copy.ts`; copied because those files import icons.
const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draf',
  active: 'Berjalan',
  on_hold: 'Ditunda',
  completed: 'Selesai',
  canceled: 'Dibatalkan',
};
const CONDITION_LABEL: Record<ProjectCondition, string> = {
  on_track: 'Lancar',
  at_risk: 'Perlu perhatian',
  off_track: 'Terlambat',
};
const ROLE_LABEL: Record<ProjectMemberRole, string> = {
  manager: 'Pengelola',
  member: 'Anggota',
  viewer: 'Pemantau',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const SOMEONE = 'Seseorang';
const SOMEONE_ELSE = 'seorang anggota';
const DELETED_SUFFIX = '(akun dihapus)';

const text = (payload: unknown, key: string): string | undefined => {
  const v =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>)[key] : undefined;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
};
const pick = <T extends string>(map: Record<T, string>, v: string | undefined) =>
  v && v in map ? map[v as T] : undefined;

/** `2026-10-15` to `15 Okt`, with the year only when `withYear` says the two dates differ in year. */
function shortDate(iso: string | undefined, withYear: boolean): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  if (!m || !month) return iso ?? '?';
  return `${Number(m[3])} ${month}${withYear ? ` ${m[1]}` : ''}`;
}

/** Display name of whoever acted; keeps the stored name once the account is deleted. */
export function actorLabel(actorId: string | null, actorName: string | null): string | null {
  if (!actorName) return null;
  return actorId ? actorName : `${actorName} ${DELETED_SUFFIX}`;
}

/** Account ids a sentence of this activity names besides the actor; the query resolves them in one lookup. */
export function mentionedUserIds(action: string, payload: unknown): string[] {
  const key = action === 'lead_changed' ? 'to' : action.startsWith('member_') ? 'userId' : null;
  const id = key ? text(payload, key) : undefined;
  return id ? [id] : [];
}

// What the plan actions do to "fase X" / "milestone X"; the suffix after the dot picks the sentence.
const PLAN_SENTENCES: Record<string, (what: string) => string> = {
  created: (w) => `menambahkan ${w}`,
  added: (w) => `menambahkan ${w}`,
  updated: (w) => `mengubah ${w}`,
  moved: (w) => `memindahkan ${w}`,
  reordered: (w) => `mengurutkan ulang ${w}`,
  deleted: (w) => `menghapus ${w}`,
  removed: (w) => `menghapus ${w}`,
  started: (w) => `memulai ${w}`,
  finished: (w) => `menyelesaikan ${w}`,
  reached: (w) => `menandai ${w} sudah tercapai`,
  unreached: (w) => `membatalkan tanda tercapai pada ${w}`,
};

/** `phase.*` and `milestone.*`: the sentence comes from the suffix, the noun from the prefix. */
function describePlan(kind: 'phase' | 'milestone', op: string, payload: unknown): string {
  const name = text(payload, 'name') ?? text(payload, 'title');
  const what = `${kind === 'phase' ? 'fase' : 'milestone'}${name ? ` ${name}` : ''}`;
  const say = PLAN_SENTENCES[op] ?? ((w: string) => `mengubah ${w}`);
  return say(what);
}

/** The part of the sentence after the actor's name. */
function predicate(action: string, payload: unknown, names: ReadonlyMap<string, string>): string {
  const who = (key: string) => names.get(text(payload, key) ?? '') ?? SOMEONE_ELSE;
  switch (action) {
    case 'created':
      return 'membuat proyek ini';
    case 'updated':
      return 'mengubah keterangan proyek';
    case 'status_changed': {
      const next = pick(STATUS_LABEL, text(payload, 'to'));
      return next ? `mengubah status proyek menjadi ${next}` : 'mengubah status proyek';
    }
    case 'lead_changed':
      return `menjadikan ${who('to')} sebagai Pengelola utama`;
    case 'trashed':
      return 'memindahkan proyek ke Sampah';
    case 'restored':
      return 'memulihkan proyek dari Sampah';
    case 'member_added': {
      const role = pick(ROLE_LABEL, text(payload, 'role'));
      return `menambahkan ${who('userId')} ke proyek${role ? ` sebagai ${role}` : ''}`;
    }
    case 'member_role_changed': {
      const role = pick(ROLE_LABEL, text(payload, 'to'));
      return `mengubah peran ${who('userId')}${role ? ` menjadi ${role}` : ''}`;
    }
    case 'member_removed':
      return `mengeluarkan ${who('userId')} dari proyek`;
    case 'deadline.extended': {
      const [from, to] = [text(payload, 'from'), text(payload, 'to')];
      const withYear = from?.slice(0, 4) !== to?.slice(0, 4);
      return `memperpanjang tenggat ${shortDate(from, withYear)} → ${shortDate(to, withYear)}`;
    }
    case 'condition.overridden': {
      const level = pick(CONDITION_LABEL, text(payload, 'condition'));
      return level
        ? `mengatur kondisi proyek secara manual menjadi ${level}`
        : 'mengatur kondisi proyek secara manual';
    }
    case 'condition.override_cleared':
      return 'menghapus kondisi manual proyek';
    default: {
      const [kind, ...rest] = action.split('.');
      if (kind === 'phase' || kind === 'milestone')
        return describePlan(kind, rest.join('.'), payload);
      return 'mengubah proyek';
    }
  }
}

/** One full sentence; never throws, whatever `action` and `payload` hold. */
export function describeActivity(
  action: string,
  payload: unknown,
  actor: string | null,
  names: ReadonlyMap<string, string> = new Map(),
): string {
  return `${actor ?? SOMEONE} ${predicate(action, payload, names)}`;
}

export function toActivityItem(
  row: ActivityRow,
  names: ReadonlyMap<string, string>,
): ActivityItemDto {
  const actorName = actorLabel(row.actorId, row.actorName);
  return {
    id: row.id,
    action: row.action,
    text: describeActivity(row.action, row.payload, actorName, names),
    actorId: row.actorId,
    actorName,
    createdAt: row.createdAt.toISOString(),
  };
}
