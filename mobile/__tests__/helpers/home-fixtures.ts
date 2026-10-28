// `GET /api/app/home` as the server sends it (`server/home/home.dto.ts`), for the tests that read
// Home. Written against the sample's own day (TEST_CLOCK: Wed 7 Oct 2026, Asia/Jakarta).
//
// The sentences are Indonesian on purpose: that is what the server composes, and the app shows them
// as they came (K5). The agenda event starts at 06.00 in the team zone, which is the previous day in
// UTC — the case that would move it a day if anything read the instant without the zone (K2).
import type { HomeResponse } from '@/data/home.api';
import { homeResource } from '@/data/home.api';
import { TODAY } from '@/data/sample/today';

import type { AuthRoutes } from './auth-server';

const ATLAS = { id: 'atlas', name: 'Atlas Project' };

export const HOME_WIRE: HomeResponse = {
  now: {
    today: TODAY,
    timeZone: 'Asia/Jakarta',
    iso: '2026-10-07T00:30:00Z',
    greeting: 'pagi',
    dateLabel: 'Rabu, 7 Oktober 2026',
    timeLabel: '07.30',
  },
  briefing: {
    ok: true,
    data: {
      lines: [
        'Ada 1 tugas yang terlambat: "Fix SSO login" sudah lewat 2 hari.',
        'Hari ini ada 1 tugas dan 1 acara.',
      ],
      updatedLabel: '07.30',
    },
  },
  counters: {
    ok: true,
    data: { unassigned: 1, inProgress: 2, completed: 3, managedProjects: 1, memberProjects: 4 },
  },
  focus: {
    ok: true,
    data: {
      items: [
        {
          id: 't-12',
          number: 12,
          title: 'Fix SSO login',
          project: ATLAS,
          dueDate: '2026-10-05',
          group: 'overdue',
          overdueDays: 2,
          priority: 'high',
          // In review: the server's policy offers neither step, so the row gets no button.
          action: null,
        },
        {
          id: 't-14',
          number: 14,
          title: 'Write the API spec',
          project: ATLAS,
          dueDate: TODAY,
          group: 'today',
          overdueDays: null,
          priority: 'medium',
          action: 'complete',
        },
        {
          id: 't-9',
          number: 9,
          title: 'Prepare the sprint demo',
          project: ATLAS,
          dueDate: '2026-10-09',
          group: 'week',
          overdueDays: null,
          priority: 'medium',
          action: 'start',
        },
        {
          id: 't-20',
          number: 20,
          title: 'Write the retro notes',
          project: ATLAS,
          dueDate: null,
          group: 'none',
          overdueDays: null,
          priority: 'low',
          action: 'start',
        },
      ],
      total: 7,
      overdueTotal: 1,
      todayTotal: 1,
      awaitingReview: [
        {
          id: 't-17',
          number: 17,
          title: 'Fix the save button on the profile page',
          project: ATLAS,
        },
      ],
      awaitingReviewTotal: 2,
    },
  },
  done: {
    ok: true,
    data: {
      items: [
        {
          id: 't-5',
          number: 5,
          title: 'Tile price survey',
          project: ATLAS,
          byName: 'Anda',
          dayLabel: 'hari ini',
        },
      ],
      total: 4,
    },
  },
  projects: {
    ok: true,
    data: [
      {
        id: 'atlas',
        name: 'Atlas Project',
        dueDate: '2026-10-31',
        progress: { done: 4, total: 10, percent: 40 },
        condition: 'at_risk',
        reason: 'baru 4 dari 10 tugas selesai',
      },
      {
        id: 'sinar',
        name: 'PT Sinar Client Portal',
        dueDate: null,
        progress: { done: 0, total: 0, percent: null },
        condition: null,
        reason: null,
      },
    ],
  },
  agenda: {
    ok: true,
    data: [
      {
        id: 'review',
        title: 'Onboarding design review',
        kind: 'review',
        startsAt: '2026-10-06T23:00:00Z',
        endsAt: '2026-10-07T00:00:00Z',
        locationType: 'offline',
        project: ATLAS,
        day: 'today',
      },
      {
        id: 'standup',
        title: 'Atlas daily stand-up',
        kind: 'meeting',
        startsAt: '2026-10-08T02:00:00Z',
        endsAt: '2026-10-08T02:15:00Z',
        locationType: 'online',
        project: ATLAS,
        day: 'tomorrow',
      },
    ],
  },
  activity: {
    ok: true,
    data: [
      {
        id: 'a-1',
        text: 'Anda menyelesaikan "Tile price survey"',
        projectName: 'Kitchen Renovation',
        at: '2026-10-07T02:00:00Z',
        taskNumber: 5,
      },
      {
        id: 'a-2',
        text: 'Rina Hapsari menambahkan catatan di "Order catering"',
        projectName: 'Family Celebration',
        at: '2026-10-06T10:00:00Z',
        taskNumber: 8,
      },
    ],
  },
  ask: {
    ok: true,
    data: [
      {
        key: 'behind',
        question: 'Proyek mana yang tertinggal?',
        answer: 'Atlas Project paling tertinggal: baru 4 dari 10 tugas selesai.',
        bars: [
          { label: 'Atlas Project', pct: 40, display: '4/10' },
          { label: 'PT Sinar Client Portal', pct: 70, display: '7/10' },
        ],
      },
      {
        key: 'stalled',
        question: 'Tugas apa yang paling lama tertunda?',
        answer: '"Fix SSO login" sudah lewat 2 hari.',
        bars: [],
      },
      {
        key: 'busiest',
        question: 'Siapa paling banyak tugas?',
        answer: 'Dodi Pratama memegang 5 tugas aktif.',
        bars: [{ label: 'Dodi Pratama', pct: 100, display: '5' }],
      },
    ],
  },
};

/** The same payload with one section reported as failed, which is how one card fails on its own. */
export const homeWithout = (section: keyof HomeResponse): HomeResponse => ({
  ...HOME_WIRE,
  [section]: { ok: false },
});

/** Routes for `serveAuth` that answer home. */
export const homeRoutes = (body: unknown = HOME_WIRE): AuthRoutes => ({
  '/api/app/home': { body },
});

/**
 * The two counts the In Progress and Inbox chips read: my tasks in progress (`GET /api/app/tasks/counts`) and the
 * Inbox's action count (`GET /api/app/inbox/count`).
 */
export const countRoutes = (inProgress: number, inboxAction: number): AuthRoutes => ({
  '/api/app/tasks/counts': {
    body: {
      mine: { overdue: 1, today: 1, tomorrow: 0, week: 1, later: 0, none: 1 },
      byStatus: { todo: 3, in_progress: inProgress, in_review: 0, done: 2, canceled: 0 },
    },
  },
  '/api/app/inbox/count': { body: { action: inboxAction, infoUnread: 0 } },
});

/** Fills the home resource from the stubbed server, as the gate's own call would. */
export const loadHome = (): Promise<unknown> => homeResource.ensure();
