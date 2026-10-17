/** Pure side of the task timeline (S2-13): safe links in plain text, activity sentences, draft keeping. */
import { formatCalendarDate } from '~/components/ui/DateText';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import type { TimelineEntry } from '~/lib/tasks-api';
import { ACTIVITY_COPY } from './task-body.copy';
import { CANCEL_CATEGORY_LABELS } from './tasks.copy';

/** `at` is the offset in the source text, which is also a stable React key. */
export type TextPart = { kind: 'text' | 'link'; value: string; at: number };

// A candidate is a run of non-space characters starting with http:// or https://; nothing else becomes a link.
const URL_RUN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING = /[.,;:!?)\]}]+$/;

/** True only for an absolute http(s) URL; `javascript:`, `data:` and the like never pass. */
export function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Splits plain text into text and http(s) link parts; the text itself is never changed or parsed as HTML. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RUN)) {
    const start = m.index ?? 0;
    const url = m[0].replace(TRAILING, '');
    if (!isSafeUrl(url)) continue;
    if (start > last) parts.push({ kind: 'text', value: text.slice(last, start), at: last });
    parts.push({ kind: 'link', value: url, at: start });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last), at: last });
  return parts;
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const priorityLabel = (v: unknown) => {
  const key = str(v) as keyof typeof PRIORITY_LABELS | null;
  return key && key in PRIORITY_LABELS ? PRIORITY_LABELS[key].label : null;
};
const dateLabel = (v: unknown) => {
  const s = str(v);
  return s ? formatCalendarDate(s) : null;
};

type Activity = Extract<TimelineEntry, { kind: 'activity' }>;

/** One sentence for an activity row, e.g. "mengubah prioritas dari Sedang ke Tinggi". */
export function activityText(entry: Activity): string {
  const p = (entry.payload ?? {}) as Record<string, unknown>;
  switch (entry.action) {
    case 'due_date_changed':
      return ACTIVITY_COPY.due_date_changed(dateLabel(p.from), dateLabel(p.to));
    case 'priority_changed':
      return ACTIVITY_COPY.priority_changed(priorityLabel(p.from), priorityLabel(p.to));
    case 'created':
    case 'assignee_changed':
    case 'started':
    case 'unstarted':
    case 'completed':
    case 'reopened':
    case 'canceled':
    case 'uncanceled':
    case 'comment.delete':
      return ACTIVITY_COPY[entry.action];
    default:
      return ACTIVITY_COPY.fallback;
  }
}

/** Extra line under a reopen or cancel row (the reason or category plus note), plain text. */
export function activityDetail(entry: Activity): string | null {
  const p = (entry.payload ?? {}) as Record<string, unknown>;
  if (entry.action === 'reopened') {
    const reason = str(p.reason);
    return reason ? ACTIVITY_COPY.reason(reason) : null;
  }
  if (entry.action === 'canceled') {
    const cat = str(p.category) as keyof typeof CANCEL_CATEGORY_LABELS | null;
    const label = cat && cat in CANCEL_CATEGORY_LABELS ? CANCEL_CATEGORY_LABELS[cat] : null;
    const note = str(p.note);
    return [label, note].filter(Boolean).join(' — ') || null;
  }
  return null;
}

/**
 * Sends a draft and answers what the box should hold next: empty after a save, the SAME text after a
 * failure, so a refused or lost request never costs the writer their words.
 */
export async function sendKeepingDraft(
  draft: string,
  send: (text: string) => Promise<{ ok: boolean }>,
): Promise<string> {
  if (draft.trim() === '') return draft;
  const res = await send(draft);
  return res.ok ? '' : draft;
}
