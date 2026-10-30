import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { ProjectCreateChooser } from '../../app/components/projects/ProjectCreateChooser';
import { CHOOSER_COPY } from '../../app/components/projects/project-chooser.copy';
import {
  createModeOf,
  PROJECT_CHOOSER_PATH,
  PROJECT_FORM_HREF,
  PROJECT_STORY_HREF,
  PROJECT_TEMPLATE_HREF,
} from '../../app/lib/project-create-mode';

/** Renders under a data router, like the real app: the form card is a router `Link`. */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([{ id: 'root', path: '/', Component: () => node }]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}

const count = (html: string, needle: string | RegExp) =>
  html.match(typeof needle === 'string' ? new RegExp(needle, 'g') : needle)?.length ?? 0;

describe('createModeOf', () => {
  const mode = (qs: string) => createModeOf(new URLSearchParams(qs));

  it('shows the chooser on the bare URL', () => {
    expect(mode('')).toBe('choose');
  });

  it('opens the matching step for ?cara=form|cerita|template', () => {
    expect(mode('cara=form')).toBe('form');
    expect(mode('cara=form&x=1')).toBe('form');
    expect(mode('cara=cerita')).toBe('cerita');
    expect(mode('cara=template')).toBe('template');
  });

  it.each([
    ['empty', 'cara='],
    ['a typo', 'cara=fom'],
    ['another case', 'cara=FORM'],
    ['an unrelated param', 'form=1'],
  ])('falls back to the chooser for %s, so a stale link never opens half a feature', (_, qs) => {
    expect(mode(qs)).toBe('choose');
  });

  it('keeps every step URL in step with createModeOf', () => {
    expect(PROJECT_FORM_HREF).toBe(`${PROJECT_CHOOSER_PATH}?cara=form`);
    expect(PROJECT_STORY_HREF).toBe(`${PROJECT_CHOOSER_PATH}?cara=cerita`);
    expect(PROJECT_TEMPLATE_HREF).toBe(`${PROJECT_CHOOSER_PATH}?cara=template`);
    expect(createModeOf(new URL(PROJECT_FORM_HREF, 'http://x').searchParams)).toBe('form');
    expect(createModeOf(new URL(PROJECT_STORY_HREF, 'http://x').searchParams)).toBe('cerita');
    expect(createModeOf(new URL(PROJECT_TEMPLATE_HREF, 'http://x').searchParams)).toBe('template');
    expect(createModeOf(new URL(PROJECT_CHOOSER_PATH, 'http://x').searchParams)).toBe('choose');
  });
});

describe('ProjectCreateChooser', () => {
  it('offers the three ways, in the order of the flow', async () => {
    const html = await render(<ProjectCreateChooser />);
    const at = (s: string) => html.indexOf(s);
    expect(at(CHOOSER_COPY.form.title)).toBeGreaterThan(-1);
    expect(at(CHOOSER_COPY.story.title)).toBeGreaterThan(at(CHOOSER_COPY.form.title));
    expect(at(CHOOSER_COPY.template.title)).toBeGreaterThan(at(CHOOSER_COPY.story.title));
  });

  it('marks exactly one way as recommended: the story one', async () => {
    const html = await render(<ProjectCreateChooser />);
    expect(count(html, CHOOSER_COPY.recommended)).toBe(1);
    const story = html.slice(html.indexOf(CHOOSER_COPY.story.title));
    expect(story.indexOf(CHOOSER_COPY.recommended)).toBeLessThan(
      story.indexOf(CHOOSER_COPY.template.title),
    );
  });

  it('links all three cards, each to its own step', async () => {
    const html = await render(<ProjectCreateChooser />);
    expect(count(html, '<a ')).toBe(3);
    expect(html).toContain(`href="${PROJECT_FORM_HREF}"`);
    expect(html).toContain(`href="${PROJECT_STORY_HREF}"`);
    expect(html).toContain(`href="${PROJECT_TEMPLATE_HREF}"`);
    expect(count(html, `>${CHOOSER_COPY.choose}<`)).toBe(3);
  });

  it('never shows a disabled button: every way is built', async () => {
    const html = await render(<ProjectCreateChooser />);
    expect(html).not.toMatch(/<button[^>]*disabled/);
  });

  it('keeps the wireframe wording of the two ways it describes', async () => {
    const html = await render(<ProjectCreateChooser />);
    expect(html).toContain('AI menyusun draf tahapan dan tugasnya.');
    expect(html).toContain('Anda tetap memeriksa draf sebelum proyek dibuat.');
    expect(html).toContain('Mulai dari struktur proyek yang pernah dibuat.');
    expect(html).toContain('Cocok untuk proyek yang mirip dengan sebelumnya.');
  });

  it('hides the decorative sparkle from screen readers', async () => {
    const html = await render(<ProjectCreateChooser />);
    expect(html).toMatch(/<span aria-hidden="true"> ✦<\/span>/);
  });

  it('labels every card by its own title for assistive technology', async () => {
    const html = await render(<ProjectCreateChooser />);
    for (const id of ['form', 'story', 'template']) {
      expect(html).toContain(`aria-labelledby="create-way-${id}"`);
      expect(html).toContain(`id="create-way-${id}"`);
    }
  });
});
