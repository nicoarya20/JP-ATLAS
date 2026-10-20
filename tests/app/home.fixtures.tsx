/** Beranda data for the widget suites: one busy viewer, and builders to blank out a section. */
import type { HomeData } from '../../server/home/home.dto';

export const NOW = {
  iso: '2026-10-08T03:00:00.000Z', // test-only
  today: '2026-10-08',
  timeZone: 'Asia/Jakarta', // test-only
  greeting: 'pagi',
  dateLabel: 'Kamis, 8 Oktober 2026',
  timeLabel: '10.00',
} as const;

const project = { id: 'p1', name: 'Hajatan Keluarga' };

export const BUSY: HomeData = {
  now: NOW,
  briefing: {
    ok: true,
    data: {
      lines: [
        'Ada 1 tugas yang terlambat: "Bayar DP" sudah lewat 2 hari.',
        'Hari ini ada 2 tugas.',
      ],
      updatedLabel: '10.00',
    },
  },
  counters: {
    ok: true,
    data: { unassigned: 3, inProgress: 8, completed: 12, managedProjects: 2, memberProjects: 3 },
  },
  focus: {
    ok: true,
    data: {
      items: [
        {
          id: 't1',
          number: 12,
          title: 'Bayar DP tukang',
          project,
          dueDate: '2026-10-06',
          group: 'overdue',
          overdueDays: 2,
          priority: 'high',
          action: 'complete',
        },
        {
          id: 't2',
          number: 13,
          title: 'Pesan katering',
          project,
          dueDate: '2026-10-08',
          group: 'today',
          overdueDays: null,
          priority: 'medium',
          action: 'complete',
        },
        {
          id: 't3',
          number: 14,
          title: 'Beli cat dinding',
          project,
          dueDate: '2026-10-10',
          group: 'week',
          overdueDays: null,
          priority: 'low',
          action: 'start',
        },
        {
          id: 't4',
          number: 15,
          title: 'Tunggu kabar',
          project,
          dueDate: null,
          group: 'none',
          overdueDays: null,
          priority: 'low',
          action: null,
        },
      ],
      total: 9,
      overdueTotal: 1,
      todayTotal: 1,
      awaitingReview: [{ id: 'r1', number: 20, title: 'Periksa tombol simpan', project }],
      awaitingReviewTotal: 1,
    },
  },
  done: {
    ok: true,
    data: {
      items: [
        {
          id: 'd1',
          number: 30,
          title: 'Survei harga keramik',
          project,
          byName: 'Anda',
          dayLabel: 'hari ini',
        },
        {
          id: 'd2',
          number: 31,
          title: 'Cari lokasi tenda',
          project,
          byName: 'Dodi',
          dayLabel: 'Rabu',
        },
      ],
      total: 4,
    },
  },
  projects: {
    ok: true,
    data: [
      {
        id: 'p1',
        name: 'Hajatan Keluarga',
        dueDate: '2026-10-24',
        progress: { done: 4, total: 10, percent: 40 },
        condition: 'at_risk',
        reason: '1 tugas penting terlambat',
      },
      {
        id: 'p2',
        name: 'Renovasi Dapur',
        dueDate: null,
        progress: { done: 7, total: 10, percent: 70 },
        condition: 'on_track',
        reason: null,
      },
    ],
  },
  agenda: {
    ok: true,
    data: [
      {
        id: 'e1',
        title: 'Rapat panitia hajatan',
        kind: 'meeting',
        startsAt: '2026-10-08T03:00:00.000Z',
        endsAt: '2026-10-08T04:00:00.000Z',
        locationType: null,
        project,
        day: 'today',
      },
      {
        id: 'e2',
        title: 'Kumpul keluarga',
        kind: 'team',
        startsAt: '2026-10-09T02:00:00.000Z',
        endsAt: '2026-10-09T03:00:00.000Z',
        locationType: null,
        project: null,
        day: 'tomorrow',
      },
    ],
  },
  activity: {
    ok: true,
    data: [
      {
        id: 'a:1',
        text: 'Anda menyelesaikan "Survei harga keramik"',
        projectName: 'Hajatan Keluarga',
        at: '2026-10-08T02:00:00.000Z',
        taskNumber: 30,
      },
    ],
  },
  ask: {
    ok: true,
    data: [
      {
        key: 'behind',
        question: 'Proyek mana yang tertinggal?',
        answer: 'Hajatan Keluarga paling tertinggal: baru 4 dari 10 tugas selesai.',
        bars: [
          { label: 'Hajatan Keluarga', pct: 40, display: '40%' },
          { label: 'Renovasi Dapur', pct: 70, display: '70%' },
        ],
      },
      {
        key: 'stalled',
        question: 'Tugas apa yang paling lama tertunda?',
        answer: '"Bayar DP tukang" sudah lewat 2 hari.',
        bars: [],
      },
      {
        key: 'busiest',
        question: 'Siapa paling banyak tugas?',
        answer: 'Rina paling banyak tugas: 6 tugas aktif.',
        bars: [{ label: 'Rina', pct: 100, display: '6 tugas' }],
      },
    ],
  },
};

export const FAILED = { ok: false } as const;

export const RETRY = { onRetry: () => {}, retrying: false };
