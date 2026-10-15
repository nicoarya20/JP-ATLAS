import { describe, expect, it, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';
import { db } from '../../server/db';
import { inTx } from '../../server/pm/tx';

const ROOT = path.join(import.meta.dir, '../..');

type Violation = { rule: string; line: number };

const FORBIDDEN: Array<{ rule: string; re: RegExp }> = [
  { rule: 'db-inside-inTx', re: /(?<![\w.$])db\s*\./ },
  { rule: 'storage-inside-inTx', re: /(?<![\w.$])storage\s*\(/ },
  { rule: 'fetch-inside-inTx', re: /(?<![\w.$])fetch\s*\(/ },
  { rule: 'sleep-inside-inTx', re: /\bBun\s*\.\s*sleep\s*\(/ },
];

/** Replaces comments and string/template literal text with spaces (newlines kept) so scans see code only. */
function blank(src: string): string {
  let out = '';
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    let end = -1;
    if (two === '//') end = src.indexOf('\n', i) < 0 ? src.length : src.indexOf('\n', i);
    else if (two === '/*')
      end = src.indexOf('*/', i + 2) < 0 ? src.length : src.indexOf('*/', i + 2) + 2;
    else if (c === "'" || c === '"' || c === '`') {
      end = i + 1;
      while (end < src.length && src[end] !== c) end += src[end] === '\\' ? 2 : 1;
      end += 1;
    }
    if (end < 0) {
      out += c;
      i += 1;
    } else {
      out += src.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
    }
  }
  return out;
}

/** Finds forbidden calls inside the callbacks passed to `inTx(...)`; `line` is 1-based. */
export function scanTxDiscipline(source: string): Violation[] {
  const code = blank(source);
  const found: Violation[] = [];
  for (const m of code.matchAll(/\binTx\s*(?:<[^>(]*>)?\s*\(/g)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let close = code.length;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '(') depth++;
      else if (code[i] === ')' && --depth === 0) {
        close = i;
        break;
      }
    }
    const body = code.slice(open, close);
    for (const { rule, re } of FORBIDDEN) {
      for (const hit of body.matchAll(new RegExp(re, 'g'))) {
        found.push({ rule, line: code.slice(0, open + (hit.index ?? 0)).split('\n').length });
      }
    }
  }
  return found;
}

describe('scanTxDiscipline (against bad snippets)', () => {
  const rules = (src: string) => scanTxDiscipline(src).map((v) => v.rule);

  it('flags db. inside an inTx callback', () => {
    const src = `await inTx(async (tx) => {\n  await tx.insert(a);\n  await db.select().from(b);\n});`;
    expect(scanTxDiscipline(src)).toEqual([{ rule: 'db-inside-inTx', line: 3 }]);
  });

  it('flags storage(), fetch() and Bun.sleep inside the callback', () => {
    const src = [
      'await inTx(async (tx) => {',
      '  await storage().write(k, v);',
      '  await fetch(url);',
      '  await Bun.sleep(10);',
      '});',
    ].join('\n');
    expect(rules(src).sort()).toEqual([
      'fetch-inside-inTx',
      'sleep-inside-inTx',
      'storage-inside-inTx',
    ]);
  });

  it('flags nested blocks and a generic inTx<T> call', () => {
    const src = `inTx<number>(async (tx) => { if (x) { for (const i of y) { await db.update(t); } } return 1; })`;
    expect(rules(src)).toEqual(['db-inside-inTx']);
  });

  it('accepts a clean callback that only uses tx', () => {
    const src = `await inTx(async (tx) => {\n  const [row] = await tx.insert(p).values(v).returning();\n  await tx.insert(m).values({ projectId: row.id });\n  return row;\n});`;
    expect(scanTxDiscipline(src)).toEqual([]);
  });

  it('ignores db./fetch outside the callback, in comments and in strings', () => {
    const src = [
      'const rows = await db.select().from(t);',
      'await storage().write(k, v);',
      'await inTx(async (tx) => {',
      '  // never call db.select() or fetch() here',
      "  const msg = 'db.select() and await fetch(x)';",
      '  await tx.insert(a).values({ note: `storage() in a template` });',
      '});',
      'await fetch(url);',
      'await audit(db, e);',
    ].join('\n');
    expect(scanTxDiscipline(src)).toEqual([]);
  });

  it('does not mistake tx-prefixed or member names for forbidden calls', () => {
    const src = `await inTx(async (tx) => { await tx.db.thing(); await obj.fetch(); await mydb.x(); await tx.update(t); });`;
    expect(scanTxDiscipline(src)).toEqual([]);
  });
});

describe('server/**/*.service.ts obey the transaction rules', () => {
  it('has no db./storage()/fetch/Bun.sleep inside inTx callbacks', () => {
    const offenders: string[] = [];
    for (const rel of new Glob('server/**/*.service.ts').scanSync(ROOT)) {
      for (const v of scanTxDiscipline(readFileSync(path.join(ROOT, rel), 'utf8'))) {
        offenders.push(`${rel}:${v.line} ${v.rule}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('inTx', () => {
  it('runs the callback through db.transaction and returns its result', async () => {
    const fakeTx = { marker: 'tx' };
    const spy = spyOn(db, 'transaction').mockImplementation(((
      cb: (tx: unknown) => Promise<unknown>,
    ) => cb(fakeTx)) as unknown as typeof db.transaction);
    try {
      const seen: unknown[] = [];
      const result = await inTx(async (tx) => {
        seen.push(tx);
        return 'done';
      });
      expect(result).toBe('done');
      expect(seen).toEqual([fakeTx]);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
