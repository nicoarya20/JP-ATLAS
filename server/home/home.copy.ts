/** Words of the Beranda that the server composes (briefing, Ask Data, activity); pure, so tests read them as plain strings. */
import type { AskKey, Greeting } from './home.dto';

/** First hour (team zone, 0-23) of each part of the day; before the first one it is still night. */
const MORNING_FROM = 4;
const NOON_FROM = 11;
const AFTERNOON_FROM = 15;
const EVENING_FROM = 18;

/** "pagi" from 04.00, "siang" from 11.00, "sore" from 15.00, "malam" from 18.00 until 04.00. */
export function greetingFor(hour: number): Greeting {
  if (hour >= EVENING_FROM || hour < MORNING_FROM) return 'malam';
  if (hour >= AFTERNOON_FROM) return 'sore';
  if (hour >= NOON_FROM) return 'siang';
  return 'pagi';
}

export const BRIEFING_COPY = {
  nothing: 'Tidak ada yang mendesak hari ini.',
  overdueOne: (title: string, days: number) =>
    `Ada 1 tugas yang terlambat: "${title}" sudah lewat ${days} hari.`,
  overdueMany: (n: number, title: string, days: number) =>
    `Ada ${n} tugas yang terlambat, paling lama "${title}" (lewat ${days} hari).`,
  review: (n: number) => `${n} tugas menunggu pemeriksaan Anda.`,
  today: (tasks: number, events: number) => {
    const parts = [tasks > 0 ? `${tasks} tugas` : null, events > 0 ? `${events} acara` : null];
    return `Hari ini ada ${parts.filter(Boolean).join(' dan ')}.`;
  },
  attention: (name: string, late: boolean, reason: string | null) =>
    `Proyek "${name}" ${late ? 'terlambat' : 'perlu perhatian'}${reason ? `: ${reason}` : ''}.`,
} as const;

export const ASK_QUESTIONS: Record<AskKey, string> = {
  behind: 'Proyek mana yang tertinggal?',
  stalled: 'Tugas apa yang paling lama tertunda?',
  busiest: 'Siapa paling banyak tugas?',
};

/** ", tenggat tinggal 16 hari" or ", tenggatnya sudah lewat 2 hari"; nothing for a project without a due date. */
function dueClause(dueIn: number | null): string {
  if (dueIn === null) return '';
  return dueIn < 0 ? `, tenggatnya sudah lewat ${-dueIn} hari` : `, tenggat tinggal ${dueIn} hari`;
}

export const ASK_COPY = {
  noProjects: 'Belum ada proyek berjalan untuk dibandingkan.',
  behind: (name: string, done: number, total: number, dueIn: number | null) =>
    `${name} paling tertinggal: baru ${done} dari ${total} tugas selesai${dueClause(dueIn)}.`,
  behindNoTasks: (name: string) => `${name} belum punya tugas, jadi belum bisa dinilai.`,
  noStalled: 'Tidak ada tugas yang terlambat. Semua sesuai jadwal.',
  stalled: (title: string, project: string, days: number) =>
    `"${title}" (${project}) sudah lewat ${days} hari dan belum selesai.`,
  noBusiest: 'Belum ada tugas aktif yang punya penanggung jawab.',
  busiest: (name: string, n: number) => `${name} paling banyak tugas: ${n} tugas aktif.`,
  tasks: (n: number) => `${n} tugas`,
  noTasks: 'Belum ada tugas',
} as const;

export const DONE_COPY = {
  me: 'Anda',
  nobody: 'Belum ada pengerja',
  today: 'hari ini',
  yesterday: 'kemarin',
} as const;

export const ACTIVITY_NAMES = {
  me: 'Anda',
  someone: 'Seseorang',
  former: 'Mantan anggota',
} as const;

type Sentence = (who: string, title: string) => string;

/** Sentence per `task_activity.action`; `comment` is a comment row, which is not an activity action. */
export const ACTIVITY_SENTENCES: Readonly<Record<string, Sentence>> = {
  comment: (who, title) => `${who} menambah catatan di "${title}"`,
  created: (who, title) => `${who} membuat tugas "${title}"`,
  started: (who, title) => `${who} mulai mengerjakan "${title}"`,
  unstarted: (who, title) => `${who} membatalkan mulai "${title}"`,
  completed: (who, title) => `${who} menyelesaikan "${title}"`,
  reopened: (who, title) => `${who} membuka lagi "${title}"`,
  canceled: (who, title) => `${who} membatalkan tugas "${title}"`,
  uncanceled: (who, title) => `${who} memulihkan tugas "${title}"`,
  assignee_changed: (who, title) => `${who} mengganti penanggung jawab "${title}"`,
  due_date_changed: (who, title) => `${who} mengubah tenggat "${title}"`,
  priority_changed: (who, title) => `${who} mengubah prioritas "${title}"`,
  // Only ever read once the task is live again (the feed filters trashed tasks out), so the pair
  // reads as the round trip it was rather than as news of a task that is gone.
  trashed: (who, title) => `${who} menghapus tugas "${title}" ke Sampah`,
  restored: (who, title) => `${who} memulihkan tugas "${title}" dari Sampah`,
};

/** For an action this file does not know: history written by a newer version must still read. */
export const ACTIVITY_FALLBACK: Sentence = (who, title) => `${who} mengubah "${title}"`;
