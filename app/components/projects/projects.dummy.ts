// DUMMY: data hardcode untuk daftar Proyek; ganti dengan data API saat S1 dibuat.
import type { ProjectCondition, ProjectStatus } from '@server/pm/enums';

export type DummyProject = {
  id: string;
  name: string;
  lead: string;
  status: ProjectStatus;
  condition: ProjectCondition;
  /** Why the condition is what it is, e.g. "1 tugas penting terlambat". */
  conditionNote: string;
  done: number;
  total: number;
  /** `YYYY-MM-DD` */
  due: string;
  /** "Diperpanjang ×1" under the date, when the due date moved. */
  extended?: string;
  members: string[];
};

export const PROJECTS: DummyProject[] = [
  {
    id: 'atlas',
    name: 'Proyek Atlas',
    lead: 'Nico',
    status: 'active',
    condition: 'at_risk',
    conditionNote: '1 tugas penting terlambat',
    done: 7,
    total: 10,
    due: '2026-10-31',
    extended: 'Diperpanjang ×1',
    members: ['Nico', 'Rina', 'Dodi', 'Agus'],
  },
  {
    id: 'sinar',
    name: 'Portal Klien PT Sinar',
    lead: 'Rina',
    status: 'active',
    condition: 'at_risk',
    conditionNote: '2 bug Kritis terlambat',
    done: 7,
    total: 20,
    due: '2026-10-20',
    members: ['Rina', 'Dodi', 'Budi'],
  },
  {
    id: 'migrasi',
    name: 'Migrasi Data Lama',
    lead: 'Dodi',
    status: 'active',
    condition: 'off_track',
    conditionNote: 'tenggat lewat 7 hari',
    done: 8,
    total: 10,
    due: '2026-09-30',
    members: ['Dodi', 'Dewi', 'Agus'],
  },
];

export const STATUS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Berjalan' },
  { value: 'on_hold', label: 'Ditunda' },
  { value: 'completed', label: 'Selesai' },
  { value: 'draft', label: 'Draf' },
  { value: 'attention', label: 'Perlu perhatian' },
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

export const SORTS = [
  { value: 'due', label: 'Tenggat terdekat' },
  { value: 'name', label: 'Nama' },
  { value: 'progress', label: 'Progres' },
] as const;
export type ProjectSort = (typeof SORTS)[number]['value'];
