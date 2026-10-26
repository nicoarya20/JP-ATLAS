// Reading a file under `server/` as text, for the guards that keep mobile's hand-kept copy of the
// server contract honest (`events.wire.ts`, the deny messages in `events.caps.ts`).
//
// Why text and not an import: mobile cannot import `server/` — it is a different project with a
// different runtime, and pulling a server module into a React Native bundle would drag its env and
// db imports along. Why `require` rather than `import`: this app's tsconfig has `types: ['jest']`
// and no Node types, on purpose, so the two Node calls are reached through here and nowhere else.
declare function require(id: string): unknown;
declare const __filename: string;

type Fs = { readFileSync: (path: string, encoding: 'utf8') => string };
type Path = { join: (...parts: string[]) => string };

const fs = require('node:fs') as Fs;
const path = require('node:path') as Path;

/** `server/` of the repository, found from this file rather than from the working directory. */
const SERVER = path.join(__filename, '..', '..', '..', '..', 'server');

/** One file under `server/`, as text. Throws (naming the path) when it has moved. */
export function readServerFile(...parts: string[]): string {
  const full = path.join(SERVER, ...parts);
  try {
    return fs.readFileSync(full, 'utf8');
  } catch (cause) {
    throw new Error(`Cannot read ${full}: the server file this guard watches has moved.`, {
      cause,
    });
  }
}
