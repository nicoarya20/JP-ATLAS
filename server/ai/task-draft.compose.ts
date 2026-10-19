/**
 * Turns the validated model answer into the response: names become project workers (by code),
 * due-date tokens become dates (by code, against `today`), kind names become kind ids, and an
 * ambiguous name becomes the one question. Pure: no database, no clock, no network.
 */
import type { IsoDate } from '../metrics/dates';
import { resolveDue } from './task-draft.dates';
import { TASK_DRAFT_MESSAGES, TASK_DRAFT_NAME_MAX } from './task-draft.limits';
import { type DraftMember, matchMember, normalizeName } from './task-draft.members';
import { ME_MARKER, type ModelOutput, type RawDraft } from './task-draft.schema';
import type { TaskDraft, TaskDraftQuestion, TaskDraftResponse } from './task-draft.types';

export type ComposeContext = {
  /** The project's Pengelola and Anggota: the only people a draft may be assigned to. */
  members: readonly DraftMember[];
  /** The project's active task kinds. */
  kinds: ReadonlyArray<{ id: string; name: string }>;
  /** The user asking, for "saya" / "aku". */
  actorId: string;
  /** "Today" in the app time zone. */
  today: IsoDate;
};

/** A name that fits several members, with the drafts that wrote it. */
type Ambiguity = { name: string; members: DraftMember[]; draftIndexes: number[] };

type Assignee = {
  id: string | null;
  note: string | null;
  ambiguous?: { name: string; members: DraftMember[] };
};

function resolveAssignee(written: string | null, ctx: ComposeContext): Assignee {
  if (written === null) return { id: null, note: null };
  if (written === ME_MARKER) {
    const me = ctx.members.find((m) => m.id === ctx.actorId);
    return me ? { id: me.id, note: null } : { id: null, note: TASK_DRAFT_MESSAGES.selfNotWorker };
  }
  const match = matchMember(written, ctx.members);
  const name = written.slice(0, TASK_DRAFT_NAME_MAX);
  if (match.kind === 'one') return { id: match.member.id, note: null };
  if (match.kind === 'none') return { id: null, note: TASK_DRAFT_MESSAGES.notWorker(name) };
  return {
    id: null,
    note: TASK_DRAFT_MESSAGES.ambiguousName(name),
    ambiguous: { name, members: match.members },
  };
}

function kindIdOf(name: string | null, kinds: ComposeContext['kinds']): string | null {
  if (name === null) return null;
  const wanted = normalizeName(name);
  return kinds.find((k) => normalizeName(k.name) === wanted)?.id ?? null;
}

/** Groups ambiguous names; only the first group is asked about (one question at a time). */
function questionOf(found: Map<string, Ambiguity>, open: string | null): TaskDraftQuestion | null {
  const first = found.values().next().value as Ambiguity | undefined;
  if (first) {
    return {
      text: TASK_DRAFT_MESSAGES.whichOne(first.name),
      options: first.members.map((m) => ({ id: m.id, label: m.name })),
      draftIndexes: first.draftIndexes,
    };
  }
  return open ? { text: open, draftIndexes: [] } : null;
}

/** Builds the response from a validated model answer; see `task-draft.types.ts` for the contract. */
export function composeDrafts(out: ModelOutput, ctx: ComposeContext): TaskDraftResponse {
  const ambiguities = new Map<string, Ambiguity>();
  const drafts = out.drafts.map((raw: RawDraft, index): TaskDraft => {
    const who = resolveAssignee(raw.assignee, ctx);
    if (who.ambiguous) {
      const key = normalizeName(who.ambiguous.name);
      const seen = ambiguities.get(key);
      if (seen) seen.draftIndexes.push(index);
      else ambiguities.set(key, { ...who.ambiguous, draftIndexes: [index] });
    }
    return {
      title: raw.title,
      assigneeId: who.id,
      assigneeNote: who.note,
      dueDate: raw.due ? resolveDue(raw.due, ctx.today) : null,
      priority: raw.priority,
      kindId: kindIdOf(raw.kind, ctx.kinds),
      description: raw.description,
    };
  });
  return { drafts, question: questionOf(ambiguities, out.question) };
}
