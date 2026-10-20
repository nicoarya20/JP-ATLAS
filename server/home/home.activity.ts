/** Sentences of "Latest Activity": who did what to which task, in plain Indonesian; pure. */
import { ACTIVITY_FALLBACK, ACTIVITY_NAMES, ACTIVITY_SENTENCES } from './home.copy';

/** One sentence for a task activity row (or `comment`); an unknown action still reads safely. */
export function activitySentence(action: string, who: string, title: string): string {
  const make = Object.hasOwn(ACTIVITY_SENTENCES, action) ? ACTIVITY_SENTENCES[action] : undefined;
  return (make ?? ACTIVITY_FALLBACK)(who, title);
}

/**
 * The name shown for the one who acted: "Anda" for me, the current display name for a live account,
 * the name kept at the time when the lookup came back empty, "Mantan anggota" once the account is gone.
 */
export function whoLabel(
  viewerId: string,
  actorId: string | null,
  currentName: string | null,
  keptName: string | null,
): string {
  if (actorId === null) return ACTIVITY_NAMES.former;
  if (actorId === viewerId) return ACTIVITY_NAMES.me;
  return currentName ?? keptName ?? ACTIVITY_NAMES.someone;
}
