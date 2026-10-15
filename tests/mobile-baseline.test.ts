import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';

const ROOT = path.join(import.meta.dir, '..');
// CLAUDE.md "Mobile-Friendly": these are the blockers for the product UI areas.
const SCANNED = ['app/components/ui', 'app/components/pm', 'app/routes/app'];
const MIN_FILES = 10; // a scan that silently found nothing would be green for the wrong reason

type Tag = { text: string; end: number; selfClosing: boolean };

/** Reads one JSX opening tag from `start` (at `<`), skipping `>` inside `{…}` expressions and strings. */
function readOpeningTag(src: string, start: number): Tag {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || (c === '`' && depth > 0)) {
      quote = c;
    } else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) {
      return { text: src.slice(start, i + 1), end: i + 1, selfClosing: src[i - 1] === '/' };
    }
  }
  return { text: src.slice(start), end: src.length, selfClosing: true };
}

/** Source of the element body that follows `tag`, up to its matching `</Group>`. */
function groupBody(src: string, tag: Tag): string {
  let depth = 1;
  const re = /<(\/?)Group\b/g;
  re.lastIndex = tag.end;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[1]) depth--;
    else if (!readOpeningTag(src, m.index).selfClosing) depth++;
    if (depth === 0) return src.slice(tag.end, m.index);
  }
  return src.slice(tag.end);
}

/** Mobile blockers in one source file: a floating Burger, or a nowrap Group that holds a Button. */
function findMobileViolations(src: string): string[] {
  const found: string[] = [];
  for (const m of src.matchAll(/<Burger\b/g)) {
    const tag = readOpeningTag(src, m.index);
    if (/\bpos=(?:"fixed"|'fixed'|\{\s*['"]fixed['"]\s*\})/.test(tag.text)) {
      found.push('Burger pos="fixed" without AppShell.Header');
    }
  }
  for (const m of src.matchAll(/<Group\b/g)) {
    const tag = readOpeningTag(src, m.index);
    const nowrap = /\bwrap=(?:"nowrap"|'nowrap'|\{\s*['"]nowrap['"]\s*\})/.test(tag.text);
    if (nowrap && !tag.selfClosing && /<Button\b/.test(groupBody(src, tag))) {
      found.push('Group wrap="nowrap" containing a Button');
    }
  }
  return found;
}

function scannedFiles(): string[] {
  return SCANNED.flatMap((dir) =>
    [...new Glob('**/*.tsx').scanSync({ cwd: path.join(ROOT, dir) })].map((f) => path.join(dir, f)),
  );
}

describe('findMobileViolations (scanner self-check)', () => {
  it('flags a floating fixed Burger, also when the tag spans lines and holds an arrow function', () => {
    const bad = `<Burger
      opened={open}
      onClick={() => setOpen((o) => !o)}
      pos="fixed"
      top={8}
    />`;
    expect(findMobileViolations(bad)).toHaveLength(1);
    expect(findMobileViolations(`<Burger pos={'fixed'} />`)).toHaveLength(1);
  });

  it('flags a nowrap Group that contains a Button, including nested markup', () => {
    const bad = `<Group wrap="nowrap" gap="xs"><Text>Judul</Text><Group><Button>Simpan</Button></Group></Group>`;
    expect(findMobileViolations(bad)).toHaveLength(1);
  });

  it('accepts the sanctioned patterns', () => {
    const good = `
      <AppShell.Header hiddenFrom="sm"><Burger opened={o} onClick={t} size="sm" /></AppShell.Header>
      <Group wrap="wrap"><Button>Simpan</Button></Group>
      <Group wrap="nowrap" gap="xs"><Avatar /><Text truncate>Nama</Text></Group>
      <Group wrap="nowrap"><Text>Satu</Text></Group><Button>Di luar grup</Button>
      <Group wrap="nowrap" />`;
    expect(findMobileViolations(good)).toEqual([]);
  });

  it('does not mistake a Button after a closed nowrap Group for its child', () => {
    const src = `<Group wrap="nowrap"><Text>a</Text></Group><Group><Button>x</Button></Group>`;
    expect(findMobileViolations(src)).toEqual([]);
  });
});

describe('mobile baseline of the product UI', () => {
  it('scans a meaningful number of files', () => {
    expect(scannedFiles().length).toBeGreaterThanOrEqual(MIN_FILES);
  });

  it('has no floating Burger and no nowrap Group around Buttons in ui/, pm/ and routes/app/', () => {
    const offenders = scannedFiles().flatMap((file) =>
      findMobileViolations(readFileSync(path.join(ROOT, file), 'utf8')).map((v) => `${file}: ${v}`),
    );
    expect(offenders).toEqual([]);
  });
});
