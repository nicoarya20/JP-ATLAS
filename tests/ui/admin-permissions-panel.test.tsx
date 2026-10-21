/**
 * The "Peran & izin" panel (P11 AD-09): registered on the settings tab, read-only, and readable on
 * a 375px phone — five columns can only work as a sideways-scrolling table plus a card per
 * capability (CLAUDE.md §Mobile-Friendly, 2). Rendered as markup: the view takes the matrix the
 * server derived, so no request is needed here.
 */
import { describe, expect, it } from 'bun:test';
import { SETTINGS_PANELS } from '../../app/components/admin/settings/panels';
import { PeranIzinPanel } from '../../app/components/admin/settings/panels/peran-izin';
import {
  MATRIX_COPY,
  PermissionsMatrixView,
} from '../../app/components/admin/settings/panels/peran-izin.view';
import { buildPermissionsMatrix } from '../../server/access/permissions-matrix';
import { renderUi } from '../support/render-ui';

const matrix = buildPermissionsMatrix();

async function html(): Promise<string> {
  return renderUi(<PermissionsMatrixView matrix={matrix} />);
}

/** `&` comes back escaped, and the markup is far too large to put inside an expectation. */
const shows = (markup: string, text: string) => markup.includes(text.replace(/&/g, '&amp;'));

describe('peran-izin panel registration', () => {
  it('is the panel the settings shell renders for the tab', () => {
    expect(SETTINGS_PANELS['peran-izin']).toBe(PeranIzinPanel);
  });
});

describe('the matrix view', () => {
  it('shows every role as a column and every capability as a row', async () => {
    const markup = await html();
    for (const role of matrix.roles) expect(shows(markup, role.label)).toBe(true);
    for (const cap of matrix.capabilities) {
      expect(shows(markup, cap.label)).toBe(true);
      expect(shows(markup, cap.description)).toBe(true);
    }
  });

  it('answers in words, not only in colour', async () => {
    const markup = await html();
    expect(shows(markup, MATRIX_COPY.yes)).toBe(true);
    expect(shows(markup, MATRIX_COPY.no)).toBe(true);
  });

  it('shows the value of a non-boolean cell, such as the home area', async () => {
    const markup = await html();
    const home = matrix.capabilities.find((c) => c.id === 'home');
    for (const note of new Set((home?.cells ?? []).map((c) => c.note))) {
      expect(shows(markup, note ?? '')).toBe(true);
    }
  });

  it('scrolls the wide table sideways instead of overflowing the page', async () => {
    const markup = await html();
    expect(markup).toContain('overflow-x:auto');
  });

  it('gives the phone a card per capability instead of that table', async () => {
    const markup = await html();
    // Mantine turns the responsive props into these utility classes.
    expect(markup).toContain('mantine-visible-from-sm');
    expect(markup).toContain('mantine-hidden-from-sm');
  });

  it('repeats every answer in the card view, so nothing is desktop-only', async () => {
    const markup = await html();
    const cards = markup.slice(markup.indexOf('mantine-hidden-from-sm'));
    for (const role of matrix.roles) expect(shows(cards, role.label)).toBe(true);
    for (const cap of matrix.capabilities) expect(shows(cards, cap.label)).toBe(true);
  });

  it('offers nothing to press: the tab is read-only', async () => {
    const markup = await html();
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<select');
  });
});
