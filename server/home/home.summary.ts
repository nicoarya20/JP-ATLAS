/**
 * Daily briefing of the Beranda: a few plain sentences put together by rules from numbers the page
 * already holds. No model is involved, so the same data always reads the same and nothing is invented.
 */
import type { ProjectCondition } from '../pm/enums';
import { BRIEFING_COPY } from './home.copy';

export type BriefingInput = {
  overdueTotal: number;
  /** The most overdue task of mine, when any. */
  oldestOverdue: { title: string; days: number } | null;
  awaitingReviewTotal: number;
  todayTasks: number;
  todayEvents: number;
  /** The worst of my running projects when it is late or at risk. */
  attention: { name: string; condition: ProjectCondition; reason: string | null } | null;
};

/** Sentences in order of urgency: overdue, review, the day, the project that needs a look; calm days say so once. */
export function composeBriefing(i: BriefingInput): string[] {
  const lines: string[] = [];
  if (i.overdueTotal > 0 && i.oldestOverdue) {
    const { title, days } = i.oldestOverdue;
    lines.push(
      i.overdueTotal === 1
        ? BRIEFING_COPY.overdueOne(title, days)
        : BRIEFING_COPY.overdueMany(i.overdueTotal, title, days),
    );
  }
  if (i.awaitingReviewTotal > 0) lines.push(BRIEFING_COPY.review(i.awaitingReviewTotal));
  if (i.todayTasks > 0 || i.todayEvents > 0)
    lines.push(BRIEFING_COPY.today(i.todayTasks, i.todayEvents));
  if (i.attention) {
    const { name, condition, reason } = i.attention;
    lines.push(BRIEFING_COPY.attention(name, condition === 'off_track', reason));
  }
  return lines.length > 0 ? lines : [BRIEFING_COPY.nothing];
}
