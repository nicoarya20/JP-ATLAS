/**
 * Contract of the curated feature catalogue (RD-09, plan `P13-admin-data-nyata.md` §7) and of the
 * two screens that quote it: the read-only Admin tab and the key/value editor in /dev.
 *
 * Three things are guarded here. The catalogue is exactly the four `/app` features — `export` and
 * `api-keys` are operator tools and may never come back (§4 K5, §9 R4). The Admin tab reads and
 * nothing else: no switch, no save, no mutation, so `PUT /api/settings/features` stays
 * super-admin's alone (§3 D5). And both screens take a key's Indonesian name from this one file,
 * so a key cannot pick up a second name.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  FEATURE_CATALOG,
  FEATURE_CATALOG_KEYS,
  featureEntry,
  featureLabel,
  readFeatureStatus,
} from '../server/features.catalog';
import { FLAG_KEY_RE, MAX_FLAGS } from '../server/settings-features';

const ROOT = path.join(import.meta.dir, '..');
const ADMIN_PANEL = 'app/components/admin/settings/fitur.panel.tsx';
const DEV_CARD = 'app/components/settings/FeatureFlagsCard.tsx';
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

describe('feature catalogue', () => {
  test('holds exactly the four /app features, in plan order', () => {
    expect(FEATURE_CATALOG_KEYS).toEqual(['leave', 'events', 'trash', 'ask-data']);
    expect(FEATURE_CATALOG).toHaveLength(4);
  });

  test('leaves out the operator tools, which are not /app features', () => {
    expect(FEATURE_CATALOG_KEYS).not.toContain('export');
    expect(FEATURE_CATALOG_KEYS).not.toContain('api-keys');
    expect(featureEntry('export')).toBeUndefined();
    expect(featureEntry('api-keys')).toBeUndefined();
  });

  test('every key is a storable flag key and appears once', () => {
    for (const key of FEATURE_CATALOG_KEYS) expect(FLAG_KEY_RE.test(key)).toBe(true);
    expect(new Set(FEATURE_CATALOG_KEYS).size).toBe(FEATURE_CATALOG_KEYS.length);
    expect(FEATURE_CATALOG.length).toBeLessThanOrEqual(MAX_FLAGS);
  });

  test('every entry carries a name, a one-line what, a one-line when-off and a default', () => {
    for (const f of FEATURE_CATALOG) {
      expect(f.label.trim().length).toBeGreaterThan(0);
      expect(f.description.trim()).toEndWith('.');
      expect(f.whenOff.trim()).toEndWith('.');
      expect(typeof f.defaultEnabled).toBe('boolean');
      // One line each: a sentence an operator reads at a glance, not a paragraph.
      expect(f.description).not.toInclude('\n');
      expect(f.whenOff).not.toInclude('\n');
    }
  });

  test("leave's when-off names what is on screen today, not the approval flow P14 removes", () => {
    const leave = featureEntry('leave');
    expect(leave?.whenOff).toInclude('Ketersediaan');
    expect(leave?.whenOff).toInclude('Tim');
    // Plan §3 D7: submitting leave stops happening in the app, so this sentence may not claim it.
    expect(leave?.whenOff).not.toInclude('mengajukan');
  });

  test('featureLabel answers for a catalogue key and stays silent for a stray flag', () => {
    expect(featureLabel('trash')).toBe(featureEntry('trash')?.label);
    expect(featureLabel('beta-dashboard')).toBeUndefined();
  });
});

describe('readFeatureStatus', () => {
  test('keeps catalogue order and reports a saved flag as it is stored', () => {
    const rows = readFeatureStatus({ leave: true, events: false });
    expect(rows.map((r) => r.key)).toEqual([...FEATURE_CATALOG_KEYS]);
    expect(rows[0]).toMatchObject({ key: 'leave', enabled: true, unset: false });
    expect(rows[1]).toMatchObject({ key: 'events', enabled: false, unset: false });
  });

  test('a key nobody saved counts as off, the way isFeatureEnabled answers it', () => {
    const rows = readFeatureStatus({});
    expect(rows.every((r) => r.enabled === false && r.unset)).toBe(true);
    expect(readFeatureStatus(undefined)).toHaveLength(FEATURE_CATALOG.length);
    expect(readFeatureStatus(null).every((r) => r.unset)).toBe(true);
  });

  test('a flag outside the catalogue is never listed by the Admin screen', () => {
    const rows = readFeatureStatus({ 'beta-dashboard': true, export: true, 'api-keys': true });
    expect(rows.map((r) => r.key)).toEqual([...FEATURE_CATALOG_KEYS]);
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });
});

describe('Admin tab Fitur is read-only', () => {
  const src = read(ADMIN_PANEL);

  test.each([
    ['a mutation', /useMutation/],
    ['the flag writer', /saveFeatureFlags/],
    ['a switch', /<Switch\b/],
    ['a checkbox', /<Checkbox\b/],
    ['a text input', /<(TextInput|Textarea|NumberInput)\b/],
    ['a write request', /method:\s*['"](PUT|POST|PATCH|DELETE)['"]/],
    ['an Eden call', /client\.api\./],
  ])('has no %s', (_what, pattern) => {
    expect(pattern.test(src)).toBe(false);
  });

  test('reads the public settings endpoint and lists the catalogue, not the raw flag map', () => {
    expect(src).toInclude('fetchPublicSettings');
    expect(src).toInclude('readFeatureStatus');
    expect(src).not.toMatch(/Object\.(keys|entries)\(\s*\w*features/);
  });

  test('says the badge is a flag status, so it never promises behaviour (plan §9 R3)', () => {
    expect(src).toInclude('status flag');
    expect(src).not.toInclude('fitur ini mati');
  });

  test('the preview it replaces is gone and the tab is served by the real panel', async () => {
    const { SETTINGS_PANELS } = await import('../app/components/admin/settings/panels');
    const { SETTINGS_PREVIEWS } = await import(
      '../app/components/admin/settings/settings.previews'
    );
    expect(SETTINGS_PANELS.fitur).toBeDefined();
    expect(SETTINGS_PREVIEWS.fitur).toBeUndefined();
    expect(
      await Bun.file(path.join(ROOT, 'app/components/admin/settings/fitur.tsx')).exists(),
    ).toBe(false);
  });
});

describe('one key, one name', () => {
  test.each([
    ['the Admin tab', ADMIN_PANEL],
    ['the /dev editor', DEV_CARD],
  ])('%s takes its names from the catalogue', (_who, file) => {
    expect(read(file)).toInclude("from '@server/features.catalog'");
  });

  test.each([
    ['the Admin tab', ADMIN_PANEL],
    ['the /dev editor', DEV_CARD],
  ])('%s spells no catalogue name of its own', (_who, file) => {
    const src = read(file);
    const copied = FEATURE_CATALOG.filter(
      (f) => src.includes(f.label) || src.includes(f.description) || src.includes(f.whenOff),
    ).map((f) => f.key);
    expect(copied).toEqual([]);
  });
});
