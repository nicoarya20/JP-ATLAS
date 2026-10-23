// Static rules for screen code: English UI without emoji, and typography/colour through classes and tokens, not inline styles.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const sources = walk(ROOT).filter(p => /\.(jsx?|css)$/.test(p) && !p.includes(`${join('src', 'test')}`));
const screenJsx = sources.filter(p => p.includes(join('src', 'screens')) && /\.jsx$/.test(p));
const EMOJI = /\p{Extended_Pictographic}/u;
// Circled numbers in index titles (e.g. "① Home") are text symbols, not emoji, and stay allowed.
const INLINE_STYLE = /style=\{\{[^}]*\b(fontSize|fontWeight|lineHeight|color|background)\b/;
const RAW_HEX = /#[0-9a-fA-F]{3,8}\b/;

const offenders = (files, test) => files.flatMap(p =>
  readFileSync(p, 'utf8').split('\n').map((line, i) => (test(line) ? `${relative(ROOT, p)}:${i + 1}` : null)).filter(Boolean));

describe('source lint', () => {
  it('has no emoji anywhere in src', () => {
    expect(offenders(sources, l => EMOJI.test(l))).toEqual([]);
  });
  it('keeps typography and colour out of inline styles in screens', () => {
    expect(offenders(screenJsx, l => INLINE_STYLE.test(l))).toEqual([]);
  });
  it('uses colour tokens, not raw hex, in screen JSX', () => {
    expect(offenders(screenJsx, l => RAW_HEX.test(l.replace(/(['"`])#[a-z][\w.-]*\1/g, '')))).toEqual([]);
  });
});
