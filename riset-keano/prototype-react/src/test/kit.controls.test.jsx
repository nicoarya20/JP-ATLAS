// Kit Seg: the thumb follows the picked item (--seg-i), including the last one, which upstream left halfway.
// Kit MultiChips: each tap toggles one chip and reports every picked value in item order.
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { screen } from '../core/registry';
import { MultiChips, Seg } from '../kit';
import { renderApp } from './render';

// test-only screen
screen('t.seg', { title: 'Seg', group: 'Test', Component: () => <Seg items={['List', 'Calendar']} on={1} /> });
const ABC = ['a', 'b', 'c'].map(v => ({ value: v, label: v.toUpperCase() }));
function Multi() {
  const [on, setOn] = useState(['c']);
  return <><MultiChips items={ABC} on={on} onChange={setOn} label="Letters" /><output>{on.join(',')}</output></>;
}
// test-only screen
screen('t.multi', { title: 'MultiChips', group: 'Test', Component: Multi });

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

describe('kit MultiChips', () => {
  it('toggles chips on and off and keeps the picked values in item order', async () => {
    const { container } = renderApp('t.multi');
    const chip = name => dom.getByRole('button', { name });
    const picked = () => container.querySelector('output').textContent;
    expect(dom.getByRole('group', { name: 'Letters' })).toBeInTheDocument();
    expect(chip('C')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip('A'));
    expect(picked()).toBe('a,c');
    expect(chip('A')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip('C'));
    expect(picked()).toBe('a');
    expect(chip('C')).toHaveAttribute('aria-pressed', 'false');
  });
});
