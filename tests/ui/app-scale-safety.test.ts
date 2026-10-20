/** Static guard so /app pages survive the three text sizes (scale 1 / 1.25 / 1.5): no pixel sizes that ignore `theme.scale`. */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';
import { buildTheme } from '../../app/lib/theme';
import { themeComponents } from '../../app/lib/theme-components';

const GLOBS = [
  'app/routes/app/**/*.tsx',
  'app/components/{projects,account,profile,trash,ui,tasks}/**/*.{ts,tsx}',
];
const files = GLOBS.flatMap((g) => [...new Glob(g).scanSync('.')]).sort();
const read = (f: string) => readFileSync(f, 'utf8');
const lines = (f: string) => read(f).split('\n');

/** `file:line: text` for every line matching `re` outside comments, minus allowed `file` keys. */
function hits(re: RegExp, allow: string[] = []) {
  return files.flatMap((f) =>
    allow.includes(f)
      ? []
      : lines(f).flatMap((l, i) =>
          re.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) ? [`${f}:${i + 1}: ${l.trim()}`] : [],
        ),
  );
}

describe('app scale safety (S1-16)', () => {
  it('scans a non-trivial set of files', () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files).toContain('app/routes/app/settings.tsx');
    expect(files).toContain('app/components/trash/TrashProjectList.tsx');
    expect(files).toContain('app/components/tasks/TaskRow.tsx');
    expect(files).toContain('app/routes/app/task-detail.tsx');
    expect(files).toContain('app/routes/app/task-edit.tsx');
  });

  it('has no pixel font-size (inputs must stay ≥ 16px and follow the scale)', () => {
    expect(hits(/font-?size["']?\s*[:=]\s*[{"'`]?\s*\d+(px)?\b/i)).toEqual([]);
    expect(hits(/font-?size[^\n]*\d+px/i)).toEqual([]);
  });

  it('has no numeric icon size (use size="1.25em")', () => {
    expect(hits(/<(Fi|Tb|Lu|Md|Ri)\w*[^>]*\bsize=\{\d+\}/)).toEqual([]);
  });

  it('has no hand-written media query or viewport-width reads', () => {
    expect(
      hits(/@media|min-width\s*:|max-width\s*:|matchMedia|innerWidth|useMediaQuery\(\s*['"`]/),
    ).toEqual([]);
  });

  it('has no fixed pixel width that can outgrow a 375px screen (use maw + w="100%")', () => {
    // `width` on a table column and `maw` are fine: the table scrolls and maw only caps.
    expect(
      hits(/\b(w|miw|mw)=\{\d{3,}\}|\bminWidth\s*:\s*\d{2,}|style=\{\{[^}]*\bwidth\s*:\s*\d/),
    ).toEqual([]);
  });

  it('never uses a native date or text input where Mantine covers it', () => {
    expect(hits(/<input\b|type=["']date["']/)).toEqual([]);
  });

  it('only lays out tables through ResponsiveTable (table from sm, cards below)', () => {
    const tables = hits(/<Table\b|<table\b/, ['app/components/ui/ResponsiveTable.tsx']);
    expect(tables).toEqual([]);
    const rt = read('app/components/ui/ResponsiveTable.tsx');
    expect(rt).toContain('overflowX');
    expect(rt).toContain('visibleFrom="sm"');
    expect(rt).toContain('hiddenFrom="sm"');
    expect(rt).toMatch(/renderCard/);
  });

  it('keeps every wrap="nowrap" Group shrinkable or deliberately commented', () => {
    const bad = files.flatMap((f) => {
      const ls = lines(f);
      return ls.flatMap((l, i) => {
        if (!/wrap="nowrap"/.test(l)) return [];
        const near = ls.slice(Math.max(0, i - 2), i + 4).join('\n');
        return /minWidth: 0|nowrap is safe|flexShrink/.test(near) ? [] : [`${f}:${i + 1}`];
      });
    });
    // Icon + wrapping text, no buttons. Pinned so a new one is reviewed (see PINNED_NOWRAP).
    expect(bad.length).toBeLessThanOrEqual(PINNED_NOWRAP);
  });

  it('page headers carry their buttons in a wrapping Group', () => {
    const header = read('app/components/ui/PageHeader.tsx');
    expect(header).toContain('wrap="wrap"');
    expect(header).not.toContain('wrap="nowrap"');
  });

  it('keeps touch-sized defaults: Button lg, ActionIcon xl', () => {
    expect(themeComponents.Button?.defaultProps?.size).toBe('lg');
    expect(themeComponents.ActionIcon?.defaultProps?.size).toBe('xl');
  });

  it.each([1, 1.25, 1.5])('theme at scale %s derives breakpoints from the scale', (scale) => {
    const theme = buildTheme(scale);
    expect(theme.scale).toBe(scale);
    const sm = Number.parseFloat(String(theme.breakpoints?.sm));
    const base = Number.parseFloat(String(buildTheme(1).breakpoints?.sm));
    expect(sm).toBeCloseTo(base * scale, 5);
  });
});

/** Known nowrap groups without `minWidth: 0` (icon + wrapping text). Raise only after reviewing the new one. */
const PINNED_NOWRAP = 5;
