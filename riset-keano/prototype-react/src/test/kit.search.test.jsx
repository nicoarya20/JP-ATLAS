// Kit Search: no Cancel button; a press anywhere outside the field lets go of it and clears the text (keep = only let
// go), the clear button inside keeps it focused, and the home search keeps its query and goes back by its chevron.
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../screens';
import { Search } from '../kit';
import { renderApp } from './render';

const field = () => dom.getByPlaceholderText('Find');

/** Search next to plain text; keep and a controlled value as the home search uses them. */
function Page({ keep, start }) {
  const [q, setQ] = useState(start);
  return (
    <div>
      <p>Plain content</p>
      {start == null ? <Search placeholder="Find" keep={keep} /> : <Search placeholder="Find" keep={keep} value={q} onChangeValue={setQ} />}
    </div>
  );
}

describe('kit Search', () => {
  it('draws no Cancel button, focused or not', async () => {
    render(<Page />);
    await userEvent.click(field());
    expect(document.activeElement).toBe(field());
    const lib = readFileSync(join(__dirname, '../styles/library.css'), 'utf8');
    expect(lib).toMatch(/^\.react-cupertino-ui-search-bar__cancel \{ display: none; \}/m);
  });

  it('lets go of the field and clears it on a click anywhere outside', async () => {
    render(<Page />);
    await userEvent.type(field(), 'atlas');
    await userEvent.click(dom.getByText('Plain content'));
    expect(document.activeElement).not.toBe(field());
    expect(field()).toHaveValue('');
  });

  it('blurs from a press outside even when the browser leaves the focus put (iOS Safari on plain content)', async () => {
    render(<Page />);
    await userEvent.type(field(), 'atlas');
    fireEvent.pointerDown(dom.getByText('Plain content'));
    expect(document.activeElement).not.toBe(field());
    expect(field()).toHaveValue('');
  });

  it('stays focused on a press inside the field, and its clear button empties it', async () => {
    render(<Page />);
    await userEvent.type(field(), 'atlas');
    fireEvent.pointerDown(field());
    expect(document.activeElement).toBe(field());
    await userEvent.click(document.querySelector('.clear-button'));
    expect(field()).toHaveValue('');
    expect(document.activeElement).toBe(field());
  });

  it('with keep only lets go, so a controlled query stays', async () => {
    render(<Page keep start="Atlas" />);
    await userEvent.click(field());
    await userEvent.click(dom.getByText('Plain content'));
    expect(document.activeElement).not.toBe(field());
    expect(field()).toHaveValue('Atlas');
  });

  it('keeps the home search query on a press outside and goes back by the nav bar chevron', async () => {
    window.location.hash = '';
    renderApp('home.main', 'pm');
    fireEvent.click(dom.getByRole('button', { name: /^Search/ }));
    expect(window.location.hash).toBe('#home.search');
    const input = dom.getByPlaceholderText('Search…');
    await userEvent.click(input);
    fireEvent.pointerDown(dom.getByText('Tasks'));
    expect(input).toHaveValue('Atlas');
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(window.location.hash).toBe('#home.main');
  });
});
