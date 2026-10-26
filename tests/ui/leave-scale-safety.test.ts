/** The leave components render on /app, so they follow the same scale rules as the other /app folders. */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';

const files = [
  ...new Glob('app/components/leave/**/*.{ts,tsx}').scanSync('.'),
  'app/lib/leave-api.ts',
  'app/lib/leave-view.ts',
].sort();
const MAX_LINES = 200;

const lines = (f: string) => readFileSync(f, 'utf8').split('\n');
const hits = (re: RegExp) =>
  files.flatMap((f) =>
    lines(f).flatMap((l, i) =>
      re.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) ? [`${f}:${i + 1}: ${l.trim()}`] : [],
    ),
  );

describe('leave UI scale safety', () => {
  it('scans the leave components', () => {
    // The request dialog went with the application flow (P14 CU-05); the read-only card and the
    // Inbox rejection dialog that CU-06 still owns are what is left to scan.
    expect(files).toContain('app/components/leave/LeaveCard.tsx');
    expect(files).toContain('app/components/leave/LeaveRejectModal.tsx');
    expect(files).toContain('app/components/leave/LeaveSections.tsx');
  });

  it('uses no numeric icon size, pixel font size or fixed pixel width', () => {
    expect(hits(/<(Fi|Tb|Lu)\w*[^>]*\bsize=\{\d+\}/)).toEqual([]);
    expect(hits(/font-?size[^\n]*\d+px/i)).toEqual([]);
    expect(
      hits(/\b(w|miw|mw)=\{\d{3,}\}|\bminWidth\s*:\s*\d{2,}|style=\{\{[^}]*\bwidth\s*:\s*\d/),
    ).toEqual([]);
    expect(hits(/@media|min-width\s*:|max-width\s*:|matchMedia|innerWidth/)).toEqual([]);
  });

  it('uses Mantine for dates and dialogs, never a native input, confirm or alert', () => {
    expect(hits(/<input\b|type=["']date["']/)).toEqual([]);
    expect(hits(/window\.(confirm|alert)|\bconfirm\(|\balert\(/)).toEqual([]);
  });

  it(`keeps every file within ${MAX_LINES} lines`, () => {
    expect(files.filter((f) => lines(f).length > MAX_LINES)).toEqual([]);
  });

  it('keeps every wrap="nowrap" Group shrinkable and free of buttons', () => {
    const bad = files.flatMap((f) => {
      const ls = lines(f);
      return ls.flatMap((l, i) => {
        if (!/wrap="nowrap"/.test(l)) return [];
        const near = ls.slice(Math.max(0, i - 2), i + 4).join('\n');
        return /minWidth: 0|flexShrink/.test(near) && !/<Button/.test(near)
          ? []
          : [`${f}:${i + 1}`];
      });
    });
    expect(bad).toEqual([]);
  });
});
