// DUMMY: data hardcode untuk Beranda; ganti dengan data API saat S3 dibuat.
import type { ProjectCondition } from '@server/pm/enums';

export const TODAY_LABEL = 'Kamis, 8 Oktober 2026';

export const BRIEFING = {
  lines: [
    'Ada 1 hal yang terlambat: bayar DP tukang keramik sudah lewat 2 hari.',
    'Hari ini ada 2 tugas dan 1 rapat. Proyek Hajatan Keluarga perlu perhatian karena katering belum dipesan.',
  ],
  footnote: 'Disusun otomatis dari data proyek · diperbarui 07.30',
};

export type Counter = { key: string; label: string; value: number; hint: string };
export const COUNTERS: Counter[] = [
  {
    key: 'unassigned',
    label: 'Unassigned',
    value: 3,
    hint: 'tugas di proyek Anda tanpa penanggung jawab',
  },
  { key: 'in_progress', label: 'In Progress', value: 8, hint: 'tugas Anda yang sedang aktif' },
  { key: 'completed', label: 'Completed', value: 12, hint: 'tugas Anda yang selesai' },
];

export type FocusGroup = 'late' | 'today' | 'week';
export type FocusTask = {
  id: string;
  title: string;
  meta: string;
  group: FocusGroup;
  /** Short chip text, e.g. the overdue notice. */
  chip?: string;
};
export const FOCUS_GROUP_LABELS: Record<FocusGroup, string> = {
  late: 'Terlambat',
  today: 'Hari ini',
  week: 'Minggu ini',
};
export const FOCUS_TASKS: FocusTask[] = [
  {
    id: 'f1',
    title: 'Bayar DP tukang keramik',
    meta: 'Renovasi Dapur',
    group: 'late',
    chip: 'Terlambat 2 hari',
  },
  {
    id: 'f2',
    title: 'Pesan katering untuk 80 orang',
    meta: 'Hajatan Keluarga · paling penting hari ini',
    group: 'today',
  },
  { id: 'f3', title: 'Konfirmasi tenda ke Pak Budi', meta: 'Hajatan Keluarga', group: 'today' },
  { id: 'f4', title: 'Beli cat dinding', meta: 'Renovasi Dapur · Sabtu', group: 'week' },
  { id: 'f5', title: 'Kirim undangan ke saudara', meta: 'Hajatan Keluarga · Jumat', group: 'week' },
];
/** Tasks beyond the five shown, so "Lihat semua tugas" can show the real total. */
export const FOCUS_HIDDEN_COUNT = 4;

export const COMPLETED_THIS_WEEK = [
  { id: 'c1', title: 'Survei harga keramik', meta: 'Anda · hari ini' },
  { id: 'c2', title: 'Hubungi Pak RT soal izin', meta: 'Anda · Selasa' },
];

export const LATEST_ACTIVITY = [
  {
    id: 'l1',
    text: 'Anda menyelesaikan "Survei harga keramik"',
    meta: 'Renovasi Dapur · 1 jam lalu',
  },
];

export type AskBar = { label: string; pct: number };
export type AskItem = { question: string; answer: string; bars: AskBar[] };
export const ASK_ITEMS: AskItem[] = [
  {
    question: 'Proyek mana yang tertinggal?',
    answer:
      'Hajatan Keluarga paling tertinggal: baru 4 dari 10 tugas selesai, padahal acara tinggal 16 hari.',
    bars: [
      { label: 'Hajatan Keluarga', pct: 40 },
      { label: 'Renovasi Dapur', pct: 70 },
      { label: 'Arisan RT', pct: 90 },
    ],
  },
  {
    question: 'Tugas apa yang paling lama tertunda?',
    answer: 'Bayar DP tukang keramik: sudah lewat 2 hari dan belum dikerjakan.',
    bars: [],
  },
];

export const AGENDA_TODAY = [
  {
    id: 'e1',
    time: '10.00',
    title: 'Rapat panitia hajatan',
    warning: 'Belum siap: katering belum dipesan',
  },
];

export type HomeProject = {
  id: string;
  name: string;
  condition: ProjectCondition;
  done: number;
  total: number;
  note?: string;
};
export const HOME_PROJECTS: HomeProject[] = [
  {
    id: 'p1',
    name: 'Hajatan Keluarga',
    condition: 'at_risk',
    done: 4,
    total: 10,
    note: 'acara 24 Okt',
  },
  { id: 'p2', name: 'Renovasi Dapur', condition: 'on_track', done: 7, total: 10 },
  { id: 'p3', name: 'Arisan RT', condition: 'on_track', done: 9, total: 10 },
];
