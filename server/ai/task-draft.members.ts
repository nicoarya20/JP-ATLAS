/**
 * Matches a name written in a story against the project's workers. The code decides, never the model:
 * a name that fits two members is reported as ambiguous so the user is asked, not guessed for.
 */
import { TASK_DRAFT_NAME_MAX } from './task-draft.limits';
import { replaceControl } from './task-draft.text';

export type DraftMember = { id: string; name: string };

export type MemberMatch =
  | { kind: 'none' }
  | { kind: 'one'; member: DraftMember }
  | { kind: 'many'; members: DraftMember[] };

/** Forms of address that may precede a first name ("Bu Rina"); dropped when something remains. */
const HONORIFICS = new Set(['pak', 'bapak', 'bu', 'ibu', 'mas', 'mbak', 'kak', 'bang', 'dik']);

/** Lower case, no accents, letters and digits only, words split by single spaces. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** A display name that is safe to put in a prompt or an answer: no control characters, bounded length. */
export function cleanName(s: string): string {
  return replaceControl(s, ' ').replace(/ +/g, ' ').trim().slice(0, TASK_DRAFT_NAME_MAX);
}

function queryTokens(query: string): string[] {
  const tokens = normalizeName(query).split(' ').filter(Boolean);
  const rest = tokens.filter((t) => !HONORIFICS.has(t));
  return rest.length > 0 ? rest : tokens;
}

const verdict = (found: DraftMember[]): MemberMatch =>
  found.length === 0
    ? { kind: 'none' }
    : found.length === 1 && found[0]
      ? { kind: 'one', member: found[0] }
      : { kind: 'many', members: found };

/**
 * Exact full name first ("Rina" when a member is exactly "Rina"), else every word of the query must
 * be a whole word of the member's name ("Rina" fits "Rina Wulandari" and "Rina Pratiwi": ambiguous).
 */
export function matchMember(query: string, members: readonly DraftMember[]): MemberMatch {
  const full = normalizeName(query);
  if (!full) return { kind: 'none' };
  const exact = members.filter((m) => normalizeName(m.name) === full);
  if (exact.length > 0) return verdict(exact);
  const tokens = queryTokens(query);
  return verdict(
    members.filter((m) => {
      const words = new Set(normalizeName(m.name).split(' '));
      return tokens.every((t) => words.has(t));
    }),
  );
}
