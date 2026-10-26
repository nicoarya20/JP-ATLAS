/**
 * `bun run dev:all` — backend and Metro in one terminal.
 *
 * Starts `bun run dev` (the Elysia + React Router dev server) and `bun start` in mobile/ (the
 * Expo dev server), forwards both their outputs here with a prefix, and shuts both down
 * together: on Ctrl-C, and when either one exits by itself, so you never end up talking to half
 * a stack. Exit code is the first non-zero child's.
 *
 * The backend reads PORT from .env as usual (3000 by default); Metro picks its own port. No
 * extra dependency: Bun.spawn is enough, so there is no `concurrently` to keep updated.
 */
import { spawn } from 'bun';
import { type ChildName, firstFailure, KILL_AFTER_MS, label, splitLines } from './dev-all.lib';

type Child = { name: ChildName; proc: Bun.Subprocess };

const useColour = Boolean(process.stdout.isTTY);
const prefix = (name: ChildName) => label(name, useColour);

/** Streams one child's output line by line, prefixed. */
async function pipe(name: ChildName, stream: ReadableStream<Uint8Array>): Promise<void> {
  const decoder = new TextDecoder();
  let rest = '';
  for await (const chunk of stream) {
    const { lines, rest: tail } = splitLines(rest + decoder.decode(chunk, { stream: true }));
    rest = tail;
    for (const line of lines) process.stdout.write(`${prefix(name)}${line}\n`);
  }
  if (rest) process.stdout.write(`${prefix(name)}${rest}\n`);
}

function start(name: ChildName, cmd: string[], cwd: string): Child {
  const proc = spawn({ cmd, cwd, stdin: 'inherit', stdout: 'pipe', stderr: 'pipe' });
  void pipe(name, proc.stdout as ReadableStream<Uint8Array>);
  void pipe(name, proc.stderr as ReadableStream<Uint8Array>);
  return { name, proc };
}

const children: Child[] = [];
let stopping = false;

/** Asks both children to stop, then kills whatever is still alive. */
function stopAll(signal: NodeJS.Signals = 'SIGTERM'): void {
  if (stopping) return;
  stopping = true;
  const killAll = (sig: NodeJS.Signals) => {
    for (const { proc } of children) {
      try {
        proc.kill(sig);
      } catch {
        // Already gone; nothing to stop.
      }
    }
  };
  killAll(signal);
  setTimeout(() => killAll('SIGKILL'), KILL_AFTER_MS).unref();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => stopAll(signal));
}

const root = process.cwd();
children.push(start('api', ['bun', 'run', 'dev'], root));
children.push(start('metro', ['bun', 'start'], `${root}/mobile`));

// Whichever stops first takes the other with it: a dead backend makes Metro pointless, and a
// dead Metro usually means the user meant to stop everything.
const codes = await Promise.all(
  children.map(async ({ name, proc }) => {
    const code = await proc.exited;
    if (!stopping) {
      process.stdout.write(`${prefix(name)}exited with code ${code}; stopping the other\n`);
      stopAll();
    }
    return code;
  }),
);

process.exit(firstFailure(codes));
