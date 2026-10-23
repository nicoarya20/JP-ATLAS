import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { Button, DEFAULT_THEME, MantineProvider, Paper, Text } from '@mantine/core';
import { type ElementType, createElement as h, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { buildTheme } from '../app/lib/theme';
import { DARK, LIGHT } from '../app/lib/theme-tokens';
import { cssVariablesResolver } from '../app/lib/theme-vars';
import { CALENDAR_DATE_MAX, CALENDAR_DATE_MIN } from '../server/metrics/dates';

const ROOT = new URL('../', import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, ROOT), 'utf8');

/** Untyped createElement: Mantine's polymorphic components reject plain props in `createElement`. */
const el = (type: unknown, props: Record<string, unknown> | null, ...kids: ReactNode[]) =>
  h(type as ElementType, props, ...kids);

const render = (...children: ReactNode[]) =>
  renderToString(
    h(
      MantineProvider,
      { theme: buildTheme(1), cssVariablesResolver, defaultColorScheme: 'light' },
      ...children,
    ),
  );

describe('JP Atlas tokens (handoff 2026-10-21)', () => {
  test('identity colours match the handoff palette', () => {
    expect(DARK.canvas).toBe('#071321');
    expect(LIGHT.canvas).toBe('#f4f6fa');
    expect(LIGHT.primary).toBe('#c8f904');
    expect(DARK.primary).toBe('#c8f904');
    expect(LIGHT.onPrimary).toBe('#071321');
    expect(LIGHT.violet).toBe('#5146c9');
    expect(DARK.violet).toBe('#b6b4ff');
  });

  test('every token is a 6- or 8-digit hex colour (shadow aside)', () => {
    for (const tokens of [LIGHT, DARK]) {
      for (const [name, value] of Object.entries(tokens)) {
        if (name === 'shadow') continue;
        expect(value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
      }
    }
  });

  test('both schemes publish the --jp-* handles and the canvas', () => {
    const vars = cssVariablesResolver(DEFAULT_THEME);
    expect((vars.light as Record<string, string>)['--jp-canvas']).toBe(LIGHT.canvas);
    expect((vars.dark as Record<string, string>)['--jp-canvas']).toBe(DARK.canvas);
    expect((vars.light as Record<string, string>)['--mantine-color-body']).toBe(LIGHT.surface);
    expect((vars.dark as Record<string, string>)['--mantine-color-body']).toBe(DARK.surface);
  });
});

describe('primary action is lime with navy text', () => {
  const vars = (html: string) => /<button[^>]*style="([^"]*)"/.exec(html)?.[1] ?? '';

  test('a default filled Button uses the lime tokens', () => {
    const style = vars(render(el(Button, null, 'Simpan')));
    expect(style).toContain('--button-bg:var(--jp-primary)');
    expect(style).toContain('--button-color:var(--jp-on-primary)');
    expect(style).toContain('--button-hover:var(--jp-primary-hover)');
    expect(style).toContain('var(--jp-primary-border)');
  });

  test('an explicit colour or another variant keeps Mantine behaviour', () => {
    expect(vars(render(el(Button, { color: 'red' }, 'Hapus')))).not.toContain('--jp-primary');
    expect(vars(render(el(Button, { variant: 'light' }, 'Batal')))).not.toContain('--jp-primary');
    expect(vars(render(el(Button, { variant: 'subtle' }, 'Tutup')))).not.toContain('--jp-primary');
  });
});

describe('typography, radius and surfaces', () => {
  test('Manrope is the body and heading font, served from public/fonts', () => {
    const css = read('app/lib/theme.css');
    expect(css).toContain('font-family: Manrope');
    expect(css).toContain('/fonts/Manrope-Variable.ttf');
    expect(existsSync(new URL('public/fonts/Manrope-Variable.ttf', ROOT))).toBe(true);
    expect(existsSync(new URL('public/fonts/OFL.txt', ROOT))).toBe(true);
    expect(render(el(Text, null, 'halo'))).toContain('--mantine-font-family: Manrope');
  });

  test('cards, modals and the default control use the 14 / 16 / 10 px radii', () => {
    const paper = render(el(Paper, null, 'kartu'));
    expect(paper).toContain('--paper-radius:calc(0.875rem');
    const theme = buildTheme(1);
    expect(theme.components?.Modal?.defaultProps?.radius).toBe(16);
    expect(theme.components?.Drawer?.defaultProps?.radius).toBe(16);
    expect(theme.components?.Card?.defaultProps?.radius).toBe(14);
  });

  test('every date input is bounded to the sane calendar range (PD-01)', () => {
    const props = buildTheme(1).components?.DateInput?.defaultProps as
      | { size?: string; minDate?: string; maxDate?: string }
      | undefined;
    // A mistyped year (2062 for 2026, 9999) is refused at the keyboard, not in the Gantt.
    expect(props?.minDate).toBe(CALENDAR_DATE_MIN);
    expect(props?.maxDate).toBe(CALENDAR_DATE_MAX);
    expect(props?.size).toBe('lg'); // the 50 px touch target stays
  });

  test('the page is painted with the canvas, before and after the stylesheet loads', () => {
    expect(read('app/lib/theme.css')).toMatch(/body\s*{\s*background-color:\s*var\(--jp-canvas\)/);
    const root = read('app/root.tsx');
    expect(root).toMatch(/\$\{LIGHT\.canvas\}/);
    expect(root).toMatch(/\$\{DARK\.canvas\}/);
    expect(read('public/site.webmanifest')).toContain(`"theme_color": "${DARK.canvas}"`);
  });
});
