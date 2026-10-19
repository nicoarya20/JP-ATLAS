// DUMMY: data hardcode untuk detail Proyek (tahapan, aktivitas, tim); ganti dengan data API saat S1/S5 dibuat.
import type { ProjectPriority } from '@server/pm/enums';

export type PhaseState = 'done' | 'current' | 'upcoming';
export type Milestone = { name: string /** `YYYY-MM-DD` */; due: string; done: boolean };
export type Phase = {
  name: string;
  state: PhaseState;
  /** 0-100, share of the phase's tasks that are done. */
  progress: number;
  milestones: Milestone[];
};
export type Activity = {
  who: string;
  text: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** Why, when the person gave a reason (e.g. for moving the due date). */
  note?: string;
};

export type ProjectRole = 'manager' | 'member' | 'viewer';
export const ROLE_LABELS: Record<ProjectRole, string> = {
  manager: 'Pengelola',
  member: 'Anggota',
  viewer: 'Pemantau',
};
export type ProjectPerson = { name: string; role: ProjectRole; jobTitle: string };

export type ProjectDetail = {
  description: string;
  priority: ProjectPriority;
  /** How many times the due date moved; the list and the header show "Diperpanjang ×N". */
  extensions: number;
  team: ProjectPerson[];
  phases: Phase[];
  activity: Activity[];
};

/** People the dummy world knows; the creator of a project is added on top of these. */
export const PEOPLE: ProjectPerson[] = [
  { name: 'Nico', role: 'manager', jobTitle: 'Project Manager' },
  { name: 'Rina', role: 'member', jobTitle: 'Desainer' },
  { name: 'Dodi', role: 'member', jobTitle: 'Developer' },
  { name: 'Agus', role: 'member', jobTitle: 'QA' },
  { name: 'Budi', role: 'member', jobTitle: 'Developer' },
  { name: 'Dewi', role: 'member', jobTitle: 'Analis' },
];

const person = (name: string, role: ProjectRole): ProjectPerson => ({
  name,
  role,
  jobTitle: PEOPLE.find((p) => p.name === name)?.jobTitle ?? 'Anggota tim',
});

export const DETAILS: Record<string, ProjectDetail> = {
  atlas: {
    description: 'Membangun ulang aplikasi pelanggan: login SSO, profil, dan laporan bulanan.',
    priority: 'high',
    extensions: 1,
    team: [
      person('Nico', 'manager'),
      person('Rina', 'member'),
      person('Dodi', 'member'),
      person('Agus', 'viewer'),
    ],
    phases: [
      {
        name: 'Perencanaan',
        state: 'done',
        progress: 100,
        milestones: [{ name: 'Rancangan disetujui', due: '2026-09-24', done: true }],
      },
      {
        name: 'Pengembangan',
        state: 'current',
        progress: 60,
        milestones: [{ name: 'Rilis beta', due: '2026-10-20', done: false }],
      },
      {
        name: 'Pengujian',
        state: 'upcoming',
        progress: 0,
        milestones: [{ name: 'Uji penerimaan selesai', due: '2026-10-27', done: false }],
      },
      {
        name: 'Rilis',
        state: 'upcoming',
        progress: 0,
        milestones: [{ name: 'Rilis produksi', due: '2026-10-31', done: false }],
      },
    ],
    activity: [
      { who: 'Nico', text: 'memperpanjang tenggat 15 Okt → 31 Okt', date: '2026-10-01' },
      { who: 'Nico', text: 'memulai tahapan Pengembangan', date: '2026-09-28' },
      { who: 'Agus', text: 'ditambahkan sebagai Pemantau', date: '2026-09-25' },
      { who: 'Nico', text: 'mencapai milestone “Rancangan disetujui”', date: '2026-09-24' },
    ],
  },
  sinar: {
    description: 'Portal untuk klien PT Sinar memantau tiket, tagihan, dan dokumen.',
    priority: 'critical',
    extensions: 0,
    team: [person('Rina', 'manager'), person('Dodi', 'member'), person('Budi', 'member')],
    phases: [
      {
        name: 'Perencanaan',
        state: 'done',
        progress: 100,
        milestones: [{ name: 'Brief klien disetujui', due: '2026-09-14', done: true }],
      },
      {
        name: 'Pengembangan',
        state: 'current',
        progress: 35,
        milestones: [{ name: 'Demo ke klien', due: '2026-10-14', done: false }],
      },
      {
        name: 'Serah terima',
        state: 'upcoming',
        progress: 0,
        milestones: [{ name: 'Serah terima', due: '2026-10-20', done: false }],
      },
    ],
    activity: [
      { who: 'Rina', text: 'menandai 2 bug sebagai Kritis', date: '2026-10-12' },
      { who: 'Budi', text: 'bergabung sebagai Anggota', date: '2026-09-10' },
    ],
  },
  migrasi: {
    description: 'Memindahkan data pelanggan dari sistem lama ke platform baru.',
    priority: 'medium',
    extensions: 0,
    team: [person('Dodi', 'manager'), person('Dewi', 'member'), person('Agus', 'member')],
    phases: [
      {
        name: 'Pemetaan data',
        state: 'done',
        progress: 100,
        milestones: [{ name: 'Pemetaan disetujui', due: '2026-08-20', done: true }],
      },
      {
        name: 'Pemindahan',
        state: 'current',
        progress: 80,
        milestones: [{ name: 'Data utama pindah', due: '2026-09-25', done: false }],
      },
      {
        name: 'Verifikasi',
        state: 'upcoming',
        progress: 0,
        milestones: [{ name: 'Data terverifikasi', due: '2026-09-30', done: false }],
      },
    ],
    activity: [
      { who: 'Dodi', text: 'menyelesaikan pemindahan tabel pelanggan', date: '2026-09-22' },
      { who: 'Dewi', text: 'bergabung sebagai Anggota', date: '2026-08-04' },
    ],
  },
};

/** What a project created in the dummy world starts with. */
export const EMPTY_DETAIL: Omit<ProjectDetail, 'team' | 'description' | 'priority'> = {
  extensions: 0,
  phases: [],
  activity: [],
};
