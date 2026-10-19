/** Words of the stages (tahap) and milestones (tonggak) drawn on the project timeline. */
import type { PhaseStatus } from '@server/pm/enums';

export const GANTT_PLAN_COPY = {
  status: {
    not_started: 'belum mulai',
    in_progress: 'sedang berjalan',
    done: 'selesai',
  } satisfies Record<PhaseStatus, string>,
  stage: (name: string, from: string, to: string, status: string) =>
    `Tahap ${name}: ${from} sampai ${to} (${status})`,
  milestoneReached: (title: string, date: string) => `Tonggak ${title}: ${date} (tercapai)`,
  milestoneOpen: (title: string, date: string) => `Tonggak ${title}: ${date} (belum tercapai)`,
  legendTitle: 'Arti tahap dan tonggak',
  legendWhere: 'Tahap ada di dalam batang proyek, tonggak di atasnya.',
  legendStage: {
    done: 'Tahap selesai',
    in_progress: 'Tahap sedang berjalan',
    not_started: 'Tahap belum mulai',
  } satisfies Record<PhaseStatus, string>,
  legendMilestoneReached: 'Tonggak tercapai',
  legendMilestoneOpen: 'Tonggak belum tercapai',
} as const;
