import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Badge, Button, DEFAULT_THEME, MantineProvider, Text, TextInput } from '@mantine/core';
import { type ElementType, createElement as h, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { buildTheme, theme } from '../app/lib/theme';
import { cssVariablesResolver } from '../app/lib/theme-vars';

const ROOT = new URL('../', import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, ROOT), 'utf8');
const normalized = (css: string) => css.replaceAll('"', "'"); // biome writes double quotes

/** Untyped createElement: Mantine's polymorphic components reject plain props in `createElement`. */
const el = (type: unknown, props: Record<string, unknown> | null, ...kids: ReactNode[]) =>
  h(type as ElementType, props, ...kids);

function render(scale: number, ...children: ReactNode[]): string {
  return renderToString(
    h(
      MantineProvider,
      { theme: buildTheme(scale), cssVariablesResolver, defaultColorScheme: 'light' },
      ...children,
    ),
  );
}

describe('buildTheme breakpoints and scale (X1 D2)', () => {
  test('scale 1 keeps the Mantine default breakpoints', () => {
    const built = buildTheme(1);
    expect(built.scale).toBe(1);
    expect(built.breakpoints).toEqual(DEFAULT_THEME.breakpoints);
  });

  test('1.25 multiplies every breakpoint in em (sm = 60em)', () => {
    const built = buildTheme(1.25);
    expect(built.scale).toBe(1.25);
    expect(built.breakpoints).toEqual({
      xs: '45em',
      sm: '60em',
      md: '77.5em',
      lg: '93.75em',
      xl: '110em',
    });
  });

  test('1.5 multiplies every breakpoint in em (sm = 72em)', () => {
    const built = buildTheme(1.5);
    expect(built.scale).toBe(1.5);
    expect(built.breakpoints).toEqual({
      xs: '54em',
      sm: '72em',
      md: '93em',
      lg: '112.5em',
      xl: '132em',
    });
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid scale %p', (scale) => {
    expect(() => buildTheme(scale)).toThrow(RangeError);
  });
});

describe('buildTheme tokens (R11 §3.2)', () => {
  const built = buildTheme(1);

  test('uses blue shade 8, status palettes and reduced motion', () => {
    expect(built.primaryColor).toBe('blue');
    expect(built.primaryShade).toEqual({ light: 8, dark: 8 });
    expect(built.respectReducedMotion).toBe(true);
    for (const name of ['ok', 'warn', 'danger'] as const) {
      expect(built.colors?.[name]).toHaveLength(10);
    }
  });

  test('sets large control sizes and no manual scale hacks', () => {
    const components = built.components ?? {};
    for (const name of ['Button', 'TextInput', 'Select', 'Checkbox', 'Radio', 'Switch']) {
      expect(components[name]?.defaultProps?.size).toBe('lg');
    }
    expect(components.ActionIcon?.defaultProps?.size).toBe('xl');
    expect(JSON.stringify(built)).not.toContain('--mantine-scale');
  });

  test('legacy `theme` export stays free of the new defaults until S0B-25', () => {
    expect(theme.components).toBeUndefined();
    expect(theme.scale).toBeUndefined();
  });
});

describe('SSR output', () => {
  test('buildTheme(1.5) emits --mantine-scale:1.5 and scaled breakpoints', () => {
    const html = render(1.5, el(Text, null, 'halo'));
    expect(html).toContain('--mantine-scale: 1.5');
    expect(html).toContain('--mantine-breakpoint-sm: 72em');
  });

  test('buildTheme(1) adds no scale override (styles.css already defaults to 1)', () => {
    const html = render(1, el(Text, null, 'halo'));
    expect(html).not.toContain('--mantine-scale');
    expect(html).not.toContain('--mantine-breakpoint');
  });
});

describe('R11 spike (§3.2.6, four unverified items)', () => {
  test('(4) Badge vars use rem(), so size follows theme.scale: PROVEN', () => {
    const html = render(1.5, el(Badge, null, 'Lancar'));
    expect(html).toContain('--badge-fz:calc(1rem * var(--mantine-scale))');
    expect(html).toContain('--badge-height:calc(2rem * var(--mantine-scale))');
    expect(html).toContain('--badge-padding-x:calc(0.75rem * var(--mantine-scale))');
  });

  test('(3) resolver overrides reach derived variables (dimmed, Button default border)', () => {
    const html = render(
      1.25,
      el(Text, { c: 'dimmed' }, 'x'),
      el(Button, { variant: 'default' }, 'y'),
    );
    const light = html.split(':root[data-mantine-color-scheme="light"]')[1].split('}')[0];
    expect(light).toContain('--mantine-color-dimmed: var(--mantine-color-gray-7)');
    expect(light).toContain('--mantine-color-default-border: var(--mantine-color-gray-6)');
    expect(light.match(/--mantine-color-dimmed:/g)).toHaveLength(1); // merged, not duplicated
    // Consumers read the variable, so the override propagates without touching components.
    expect(html).toContain('color:var(--mantine-color-dimmed)');
    expect(html).toContain('solid var(--mantine-color-default-border)');
  });

  test('(1) --input-bd bypasses default-border; theme.css overrides it without breaking states', () => {
    const html = render(1, el(TextInput, { label: 'a' }));
    const wrapper = /class="(m_\w+) mantine-Input-wrapper/.exec(html)?.[1];
    const input = /class="(m_\w+) mantine-Input-input/.exec(html)?.[1];
    expect(wrapper).toBeDefined();
    expect(input).toBeDefined();

    const mantine = parseRules(read('node_modules/@mantine/core/styles.css'));
    const ours = parseRules(normalized(read('app/lib/theme.css')));
    const border = (rules: Rule[], selector: RegExp) =>
      rules.filter((r) => selector.test(r.selector) && /--input-bd:/.test(r.body));

    // Mantine's own rule hard-codes gray-4 on the wrapper (not default-border).
    const baseline = border(
      mantine,
      /color-scheme='light'\] \.m_6c018570\[data-variant='default'\]$/,
    );
    expect(baseline).toHaveLength(1);
    expect(baseline[0].body).toContain('--input-bd: var(--mantine-color-gray-4)');
    expect(wrapper).toBe('m_6c018570'); // the class the selectors above are keyed on
    expect(input).toBe('m_8fb7ebe7');

    // Our override: same specificity (wins by source order), points at default-border.
    const override = border(ours, /Input-wrapper\[data-variant='default'\]$/);
    expect(override).toHaveLength(1);
    expect(override[0].body).toContain('--input-bd: var(--mantine-color-default-border)');
    expect(specificity(override[0].selector)).toEqual(specificity(baseline[0].selector));

    // Error state keeps priority: strictly higher specificity than the override.
    const error = border(mantine, /\[data-error\]:not\(\[data-variant='unstyled'\]\)$/);
    expect(error[0].body).toContain('--input-bd: var(--mantine-color-error)');
    expect(compare(specificity(error[0].selector), specificity(override[0].selector))).toBe(1);

    // Focus sets the variable on the input element itself, so it beats the inherited wrapper value.
    const focus = border(mantine, /^\.m_8fb7ebe7:focus,\s*\.m_8fb7ebe7:focus-within$/);
    expect(focus[0].body).toContain('--input-bd: var(--input-bd-focus)');
  });

  test('(2) Mantine input focus is only a 1 px border colour change; theme.css adds the ring', () => {
    const mantine = parseRules(read('node_modules/@mantine/core/styles.css'));
    const focus = mantine.find((r) => /^\.m_8fb7ebe7:focus,/.test(r.selector.trim()));
    expect(focus?.body).toContain('outline: none');
    expect(focus?.body).not.toContain('box-shadow');

    const css = normalized(read('app/lib/theme.css'));
    const ring = parseRules(css).find((r) =>
      r.selector.includes('.mantine-Input-input:focus-visible'),
    );
    expect(ring?.body).toMatch(
      /outline: calc\(0\.1875rem \* var\(--mantine-scale\)\) solid var\(--mk-focus-ring\)/,
    );
    expect(ring?.body).toMatch(/outline-offset: calc\(0\.125rem \* var\(--mantine-scale\)\)/);
    // Same specificity as Mantine's `outline: none` rule, so source order decides: documented in theme.css.
    expect(specificity('.mantine-Input-input:focus-visible')).toEqual(
      specificity('.m_8fb7ebe7:focus'),
    );
    expect(parseRules(css).some((r) => /outline:\s*none/.test(r.body))).toBe(false);
  });
});

type Rule = { selector: string; body: string };
type Specificity = [number, number, number];

/** Flat list of `selector { body }` pairs; at-rule wrappers are skipped, nesting is not needed here. */
function parseRules(css: string): Rule[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2],
  }));
}

/** Specificity of ONE complex selector (no lists): ids, classes/attributes/pseudo-classes, elements. */
function specificity(selector: string): Specificity {
  let rest = selector.replace(/:where\([^)]*\)/g, '');
  let classes = 0;
  rest = rest.replace(/:not\(([^()]*)\)/g, (_, inner: string) => {
    const [, b] = specificity(inner);
    classes += b;
    return '';
  });
  const ids = (rest.match(/#[\w-]+/g) ?? []).length;
  rest = rest.replace(/#[\w-]+/g, '');
  const attrs = (rest.match(/\[[^\]]*\]/g) ?? []).length;
  rest = rest.replace(/\[[^\]]*\]/g, '');
  const dotted = (rest.match(/\.[\w-]+/g) ?? []).length;
  rest = rest.replace(/\.[\w-]+/g, '');
  const pseudoClasses = (rest.match(/(?<!:):[\w-]+/g) ?? []).length;
  rest = rest.replace(/::?[\w-]+/g, '');
  const elements = (rest.match(/[a-z][\w-]*/gi) ?? []).length;
  return [ids, classes + attrs + dotted + pseudoClasses, elements];
}

function compare(a: Specificity, b: Specificity): -1 | 0 | 1 {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
