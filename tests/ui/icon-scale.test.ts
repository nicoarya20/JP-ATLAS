import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;

/** Berkas yang dirender di area /app (juga dipakai /dev dan /dashboard). */
const SCOPE_FILES = [
  'app/components/AppFrame.tsx',
  'app/components/UserMenu.tsx',
  'app/components/ThemeToggle.tsx',
  'app/components/account/HoldShell.tsx',
];
const SCOPE_DIRS = ['app/routes/app'];

/**
 * Kecualian eksplisit: berkas -> alasan. Kosong; ikon di berkas scope wajib `size="1.25em"`
 * agar ikut skala teks (cookie mk-text-size). `size` Avatar/kontrol Mantine bukan ikon dan tidak terdeteksi.
 */
const EXCEPTIONS: Record<string, string> = {};

// Ikon react-icons (Fi*/Tb*/Lu*) dengan `size={<angka>}` pada tag yang sama.
const PIXEL_ICON = /<(?:Fi|Tb|Lu)[A-Za-z0-9]+\b[^>]*?\bsize=\{\s*\d+\s*\}/g;

function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) return walk(rel);
    return rel.endsWith('.tsx') ? [rel] : [];
  });
}

const files = [...SCOPE_FILES, ...SCOPE_DIRS.flatMap(walk)].filter((f) => !(f in EXCEPTIONS));

describe('skala ikon di area /app', () => {
  test('berkas scope ada', () => {
    for (const f of SCOPE_FILES) expect(existsSync(join(ROOT, f))).toBe(true);
  });

  test('pemindai mendeteksi ikon berukuran piksel', () => {
    expect('<FiSun size={16} />'.match(PIXEL_ICON)).toHaveLength(1);
    expect('<TbSun\n  size={14}\n/>'.match(PIXEL_ICON)).toHaveLength(1);
    expect('<FiSun size="1.25em" />'.match(PIXEL_ICON)).toBeNull();
    expect('<Avatar size={34} />'.match(PIXEL_ICON)).toBeNull();
  });

  test.each(files)('%s tanpa size={angka} pada ikon', (file) => {
    const hits = readFileSync(join(ROOT, file), 'utf8').match(PIXEL_ICON) ?? [];
    expect(hits).toEqual([]);
  });
});
