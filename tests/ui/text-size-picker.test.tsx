/** Text size picker (S1-14): three large buttons, and the active one is marked in words, not colour only. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { TEXT_SIZES, type TextSize } from '@server/pm/enums';
import { renderToString } from 'react-dom/server';
import { APPEARANCE_COPY, TEXT_SIZE_LABELS } from '../../app/components/account/account.copy';
import { TextSizePicker } from '../../app/components/account/TextSizePicker';

const render = (value: TextSize, pending: TextSize | null = null) =>
  renderToString(
    <MantineProvider>
      <TextSizePicker value={value} pending={pending} onPick={() => {}} />
    </MantineProvider>,
  );

/** The HTML of each `<button>` in document order. */
const buttons = (html: string) => html.split('<button').slice(1);

describe('TextSizePicker', () => {
  it('shows three buttons labelled Normal, Besar and Sangat besar, smallest first', () => {
    const found = buttons(render('normal'));
    expect(found).toHaveLength(3);
    expect(TEXT_SIZES.map((s) => TEXT_SIZE_LABELS[s])).toEqual(['Normal', 'Besar', 'Sangat besar']);
    TEXT_SIZES.forEach((size, i) => {
      expect(found[i]).toContain(`>${TEXT_SIZE_LABELS[size]}<`);
    });
  });

  it.each([...TEXT_SIZES])('marks %s as active with the words "Dipakai sekarang"', (size) => {
    const found = buttons(render(size));
    const active = TEXT_SIZES.indexOf(size);
    expect(APPEARANCE_COPY.active).toBe('Dipakai sekarang');
    found.forEach((html, i) => {
      expect(html.includes(APPEARANCE_COPY.active)).toBe(i === active);
      expect(html.includes(APPEARANCE_COPY.choose)).toBe(i !== active);
      expect(html).toContain(`aria-pressed="${i === active}"`);
    });
  });

  it('previews each size at its own scale', () => {
    const found = buttons(render('normal'));
    expect(found[0]).toContain('font-size:1rem');
    expect(found[1]).toContain('font-size:1.25rem');
    expect(found[2]).toContain('font-size:1.5rem');
  });

  it('disables the other sizes while one is being saved', () => {
    const found = buttons(render('normal', 'besar'));
    expect(found[0]).toContain('disabled');
    expect(found[1]).toContain('data-loading');
    expect(found[2]).toContain('disabled');
  });
});
