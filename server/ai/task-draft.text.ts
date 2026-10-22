/** Text hygiene for what crosses the provider boundary: control characters are removed in both directions. */

const TAB = 9;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const FIRST_PRINTABLE = 0x20;
const DELETE = 0x7f;
const KEEP_LAYOUT: ReadonlySet<number> = new Set([TAB, LINE_FEED, CARRIAGE_RETURN]);

/** `s` with every control character replaced by `replacement`, except those in `keep` (default none). */
export function replaceControl(
  s: string,
  replacement: string,
  keep: ReadonlySet<number> = new Set(),
): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? FIRST_PRINTABLE;
    const control = (code < FIRST_PRINTABLE || code === DELETE) && !keep.has(code);
    out += control ? replacement : ch;
  }
  return out;
}

/** Free text from the model: control characters dropped, tabs and line breaks kept. */
export const dropControl = (s: string) => replaceControl(s, '', KEEP_LAYOUT);
