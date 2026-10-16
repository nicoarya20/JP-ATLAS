// Kit Seg: the thumb follows the picked item (--seg-i), including the last one, which upstream left halfway.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { screen } from '../core/registry';
import { Seg } from '../kit';
import { renderApp } from './render';

// test-only screen
screen('t.seg', { title: 'Seg', group: 'Test', Component: () => <Seg items={['List', 'Calendar']} on={1} /> });

describe('kit Seg', () => {
  it('passes the item count and picked index to the thumb', async () => {
    const { container } = renderApp('t.seg');
    const seg = container.querySelector('.seg');
    expect(seg.style.getPropertyValue('--seg-n')).toBe('2');
    expect(seg.style.getPropertyValue('--seg-i')).toBe('1');
    await userEvent.click(dom.getByRole('tab', { name: 'List' }));
    expect(seg.style.getPropertyValue('--seg-i')).toBe('0');
  });
});
