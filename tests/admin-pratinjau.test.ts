/**
 * Keeps the Admin preview register honest. A preview screen shows a tab's shape with sample
 * content and saves nothing (P11 AD-04..AD-08, AD-14/AD-15, P9 G-02); it is debt with a face, so
 * it may never go unlabelled and may never outlive the real panel that replaces it.
 *
 * Every file marked `// PRATINJAU(<owner>):` is listed here, every listed file is still marked,
 * every settings preview belongs to a real tab whose owner matches the marker, and no tab has
 * both a preview and a registered panel — filling a tab means deleting the preview in the same
 * commit, or this suite goes red.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';
import { isPlaceholderTab, SETTINGS_PANELS } from '../app/components/admin/settings/panels';
import { SETTINGS_PREVIEWS } from '../app/components/admin/settings/settings.previews';
import { SETTINGS_TABS } from '../app/components/admin/settings/settings.tabs';

const ROOT = path.join(import.meta.dir, '..');
const SCAN = 'app/components/admin/**/*.{ts,tsx}';
const MARKER = /^\/\/ PRATINJAU\(([^)]+)\): .+$/m;

/** Every marked file, with the task that owns it. Delete a line here when its preview goes. */
const PREVIEW_FILES: Record<string, string> = {
  'app/components/admin/home/beranda.content.ts': 'AD-14',
  'app/components/admin/home/beranda.widgets.tsx': 'AD-15',
  'app/components/admin/settings/akses-masuk.tsx': 'AD-06',
  'app/components/admin/settings/identitas.tsx': 'AD-04',
  'app/components/admin/settings/kebijakan-kerja.tsx': 'AD-07',
  'app/components/admin/settings/pemberitahuan.tsx': 'P9 G-02',
  'app/components/admin/settings/pengumuman.tsx': 'AD-05',
};

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
const markedFiles = () =>
  [...new Glob(SCAN).scanSync({ cwd: ROOT })].filter((f) => MARKER.test(read(f))).sort();

describe('PRATINJAU register', () => {
  test('lists exactly the marked files under app/components/admin', () => {
    expect(markedFiles()).toEqual(Object.keys(PREVIEW_FILES).sort());
  });

  test.each(Object.entries(PREVIEW_FILES))('%s names its owning task %s', (file, owner) => {
    expect(MARKER.exec(read(file))?.[1]).toBe(owner);
  });

  test('no preview claims to save anything', () => {
    const saving = Object.keys(PREVIEW_FILES).filter((f) =>
      /useMutation|client\.api\./.test(read(f)),
    );
    expect(saving).toEqual([]);
  });
});

describe('/dashboard/settings previews', () => {
  const tabOf = (value: string) => SETTINGS_TABS.find((t) => t.value === value);

  test('every preview fills a tab that really exists', () => {
    const strays = Object.keys(SETTINGS_PREVIEWS).filter((v) => !tabOf(v));
    expect(strays).toEqual([]);
  });

  test('a preview never shares a tab with a registered panel', () => {
    const both = Object.keys(SETTINGS_PREVIEWS).filter((v) => SETTINGS_PANELS[v]);
    expect(both).toEqual([]);
  });

  test('a preview leaves the tab counted as unfilled, so the owner register stays the truth', () => {
    for (const value of Object.keys(SETTINGS_PREVIEWS)) expect(isPlaceholderTab(value)).toBe(true);
  });

  test('each preview file carries the marker of the task its tab names as owner', () => {
    for (const [value, owner] of SETTINGS_TABS.map((t) => [t.value, t.owner] as const)) {
      if (!SETTINGS_PREVIEWS[value]) continue;
      const file = `app/components/admin/settings/${value}.tsx`;
      expect(PREVIEW_FILES[file]).toBe(owner);
    }
  });

  test('every tab has a preview or a real panel, so no tab is a blank screen', () => {
    const covered = SETTINGS_TABS.filter(
      (t) => SETTINGS_PREVIEWS[t.value] || SETTINGS_PANELS[t.value],
    );
    expect(covered.map((t) => t.value)).toEqual(SETTINGS_TABS.map((t) => t.value));
  });
});
