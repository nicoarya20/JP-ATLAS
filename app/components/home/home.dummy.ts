// DUMMY: data hardcode untuk tampilan Beranda; ganti dengan data API saat S3 dibuat.
import type { ProjectCondition, ProjectPriority, TaskStatus } from '@server/pm/enums';

export type DummyStat = { key: string; label: string; value: number; hint: string };
export type DummyTask = {
  number: number;
  title: string;
  project: string;
  status: TaskStatus;
  priority: ProjectPriority;
  /** `YYYY-MM-DD` */
  due: string;
};
export type DummyProject = {
  id: string;
  name: string;
  condition: ProjectCondition;
  done: number;
  total: number;
  timePct: number;
};
export type DummyActivity = { id: string; actor: string; text: string; at: string };

export const DUMMY_STATS: DummyStat[] = [
  { key: 'active', label: 'Tugas aktif', value: 12, hint: 'Sedang Anda kerjakan' },
  { key: 'due', label: 'Jatuh tempo pekan ini', value: 5, hint: '1 sudah terlambat' },
  { key: 'review', label: 'Menunggu diperiksa', value: 3, hint: 'Butuh persetujuan Anda' },
  { key: 'projects', label: 'Proyek aktif', value: 4, hint: 'Anda ikut di 4 proyek' },
];

export const DUMMY_TASKS: DummyTask[] = [
  {
    number: 101,
    title: 'Rancang alur login dan pendaftaran',
    project: 'Aplikasi Mobile',
    status: 'in_progress',
    priority: 'high',
    due: '2026-10-14',
  },
  {
    number: 108,
    title: 'Siapkan data uji untuk modul laporan',
    project: 'Portal Pelanggan',
    status: 'in_progress',
    priority: 'medium',
    due: '2026-10-16',
  },
  {
    number: 115,
    title: 'Tinjau desain halaman beranda',
    project: 'Redesain Website',
    status: 'in_review',
    priority: 'medium',
    due: '2026-10-17',
  },
  {
    number: 122,
    title: 'Perbaiki bug unggah lampiran',
    project: 'Portal Pelanggan',
    status: 'todo',
    priority: 'critical',
    due: '2026-10-21',
  },
  {
    number: 130,
    title: 'Tulis dokumentasi API v2',
    project: 'Integrasi Pembayaran',
    status: 'todo',
    priority: 'low',
    due: '2026-10-28',
  },
];

export const DUMMY_PROJECTS: DummyProject[] = [
  { id: 'p1', name: 'Aplikasi Mobile', condition: 'at_risk', done: 14, total: 26, timePct: 62 },
  { id: 'p2', name: 'Portal Pelanggan', condition: 'on_track', done: 31, total: 40, timePct: 70 },
  { id: 'p3', name: 'Redesain Website', condition: 'on_track', done: 9, total: 18, timePct: 45 },
  {
    id: 'p4',
    name: 'Integrasi Pembayaran',
    condition: 'off_track',
    done: 4,
    total: 22,
    timePct: 80,
  },
];

export const DUMMY_ACTIVITIES: DummyActivity[] = [
  {
    id: 'a1',
    actor: 'Rina Wulandari',
    text: 'menyelesaikan "Susun wireframe checkout"',
    at: '2026-10-16T08:40:00Z',
  },
  {
    id: 'a2',
    actor: 'Budi Santoso',
    text: 'mengomentari "Perbaiki bug unggah lampiran"',
    at: '2026-10-16T06:15:00Z',
  },
  {
    id: 'a3',
    actor: 'Dewi Lestari',
    text: 'menambahkan Anda ke proyek "Redesain Website"',
    at: '2026-10-15T14:02:00Z',
  },
  {
    id: 'a4',
    actor: 'Agus Prasetyo',
    text: 'mengubah tenggat "Tulis dokumentasi API v2"',
    at: '2026-10-15T09:30:00Z',
  },
];
