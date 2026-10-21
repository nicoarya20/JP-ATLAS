/**
 * Contract of the /dashboard/settings shell: the eight tabs of P11 §4 in that exact order, each one
 * linkable through `?tab=` and each tab still unfilled naming the task that will fill it. The route itself
 * (meta + Admin guard + descending from the admin layout) is covered by tests/admin-routes.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import { isPlaceholderTab, SETTINGS_PANELS } from '../app/components/admin/settings/panels';
import { parseSettingsTab, SETTINGS_TABS } from '../app/components/admin/settings/settings.tabs';
import routes from '../app/routes';

type Entry = { file: string; path?: string; children?: Entry[] };

describe('/dashboard/settings tabs', () => {
  test('the page is a child of the admin layout', () => {
    const layout = (routes as Entry[]).find((e) => e.file === 'routes/admin/layout.tsx');
    const child = layout?.children?.find((c) => c.path === 'dashboard/settings');
    expect(child?.file).toBe('routes/admin/settings.tsx');
  });

  test('the eight tabs keep the order of the plan', () => {
    expect(SETTINGS_TABS.map((t) => t.label)).toEqual([
      'Identitas',
      'Pengumuman',
      'Akses masuk',
      'Kebijakan kerja',
      'Pemberitahuan',
      'Fitur',
      'Peran & izin',
      'Ekspor data',
    ]);
  });

  test('every tab has a distinct url-safe value, so each tab can be linked', () => {
    const values = SETTINGS_TABS.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.filter((v) => v !== encodeURIComponent(v))).toEqual([]);
  });

  test('every tab still showing a placeholder names the task that will fill it', () => {
    const unlabelled = SETTINGS_TABS.filter(
      (t) => isPlaceholderTab(t.value) && (!t.owner || !t.description.includes(t.owner)),
    ).map((t) => t.value);
    expect(unlabelled).toEqual([]);
  });

  test('a tab with a registered panel is no longer a placeholder', () => {
    for (const value of Object.keys(SETTINGS_PANELS)) {
      expect(SETTINGS_TABS.some((t) => t.value === value)).toBe(true);
      expect(isPlaceholderTab(value)).toBe(false);
    }
  });

  test('the owners are the tasks assigned by the plan', () => {
    expect(SETTINGS_TABS.map((t) => t.owner)).toEqual([
      'AD-04',
      'AD-05',
      'AD-06',
      'AD-07',
      'P9 G-02',
      'AD-08',
      'AD-09',
      'AD-10',
    ]);
  });

  test('an unknown or missing ?tab= falls back to the first tab', () => {
    expect(parseSettingsTab(null)).toBe('identitas');
    expect(parseSettingsTab('')).toBe('identitas');
    expect(parseSettingsTab('tidak-ada')).toBe('identitas');
  });

  test('a known ?tab= is kept as is', () => {
    for (const t of SETTINGS_TABS) expect(parseSettingsTab(t.value)).toBe(t.value);
  });
});
