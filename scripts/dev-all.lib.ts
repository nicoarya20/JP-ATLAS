/** Pure parts of `bun run dev:all` (scripts/dev-all.ts), split out so they can be tested. */

/** The two children `dev:all` runs. */
export const CHILD_NAMES = ['api', 'metro'] as const;
export type ChildName = (typeof CHILD_NAMES)[number];

/** Colour per child, so two interleaved logs stay readable. */
const COLOURS: Record<ChildName, string> = { api: '\u001b[36m', metro: '\u001b[35m' };
const RESET = '\u001b[0m';

/** Grace period before a child that ignored SIGINT/SIGTERM is killed outright. */
export const KILL_AFTER_MS = 5_000;

/** Line prefix for a child's output. Colour only on a TTY, so piped logs stay plain text. */
export function label(name: ChildName, useColour: boolean): string {
  return useColour ? `${COLOURS[name]}[${name}]${RESET} ` : `[${name}] `;
}

/**
 * Splits a decoded chunk into whole lines plus the unterminated tail, which the caller carries
 * into the next chunk. Without this a prefix can land in the middle of a line.
 */
export function splitLines(buffered: string): { lines: string[]; rest: string } {
  const parts = buffered.split('\n');
  return { rest: parts.pop() ?? '', lines: parts };
}

/** Exit code for the whole run: the first child that failed, else 0. */
export function firstFailure(codes: readonly number[]): number {
  return codes.find((code) => code !== 0) ?? 0;
}
