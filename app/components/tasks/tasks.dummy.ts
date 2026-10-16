// DUMMY: data hardcode untuk daftar Tugas; ganti dengan data API saat S2 dibuat.
import type { ProjectPriority, TaskStatus } from '@server/pm/enums';

export type TaskKind = 'task' | 'issue' | 'idea';
export const KIND_LABELS: Record<TaskKind, string> = { task: 'Tugas', issue: 'Bug', idea: 'Ide' };

export type DummyTask = {
  number: number;
  title: string;
  project: string;
  kind: TaskKind;
  priority: ProjectPriority;
  status: TaskStatus;
  assignee: string;
  tags: string[];
  /** `YYYY-MM-DD` */
  due: string;
  /** Extra state shown in the middle column instead of the plain status badge. */
  note?: string;
};

/** The signed-in person in the dummy world; "Tugas saya" shows only their tasks. */
export const ME = 'Dodi';

export const TASKS: DummyTask[] = [
  {
    number: 17,
    title: 'Perbaiki tombol simpan di halaman profil',
    project: 'Proyek Atlas',
    kind: 'issue',
    priority: 'medium',
    status: 'in_review',
    assignee: ME,
    tags: ['profil'],
    due: '2026-10-17',
    note: 'Menunggu diperiksa Nico',
  },
  {
    number: 16,
    title: 'Siapkan data uji',
    project: 'Proyek Atlas',
    kind: 'task',
    priority: 'medium',
    status: 'todo',
    assignee: ME,
    tags: ['qa'],
    due: '2026-10-20',
    note: 'Tertahan oleh #12',
  },
  {
    number: 14,
    title: 'Tulis spesifikasi API',
    project: 'Proyek Atlas',
    kind: 'task',
    priority: 'high',
    status: 'in_progress',
    assignee: ME,
    tags: ['api', 'dokumen'],
    due: '2026-10-16',
  },
  {
    number: 12,
    title: 'Fix login SSO',
    project: 'Proyek Atlas',
    kind: 'issue',
    priority: 'high',
    status: 'in_progress',
    assignee: 'Rina',
    tags: ['sso'],
    due: '2026-10-14',
  },
  {
    number: 9,
    title: 'Susun draf kontrak vendor',
    project: 'Portal Klien PT Sinar',
    kind: 'task',
    priority: 'low',
    status: 'todo',
    assignee: ME,
    tags: ['legal'],
    due: '2026-10-30',
  },
  {
    number: 8,
    title: 'Rapikan backlog sprint',
    project: 'Proyek Atlas',
    kind: 'idea',
    priority: 'low',
    status: 'done',
    assignee: ME,
    tags: [],
    due: '2026-10-12',
  },
];

export const STATUS_CHIPS = [
  { value: 'active', label: 'Semua aktif' },
  { value: 'todo', label: 'Belum dikerjakan' },
  { value: 'in_progress', label: 'Sedang dikerjakan' },
  { value: 'in_review', label: 'Menunggu diperiksa' },
  { value: 'done', label: 'Selesai' },
] as const;
export type TaskStatusChip = (typeof STATUS_CHIPS)[number]['value'];

export type TaskSort = 'due' | 'priority';
export type TaskScope = 'mine' | 'all';

export type TaskFilters = {
  scope: TaskScope;
  q: string;
  status: TaskStatusChip;
  project: string | null;
  person: string | null;
  kind: string | null;
  priority: string | null;
  tag: string | null;
  sort: TaskSort;
};
export const NO_FILTERS: TaskFilters = {
  scope: 'mine',
  q: '',
  status: 'active',
  project: null,
  person: null,
  kind: null,
  priority: null,
  tag: null,
  sort: 'due',
};
