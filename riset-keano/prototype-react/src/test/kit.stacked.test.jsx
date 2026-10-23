// Stacked tab screens (kit StackedScreen: Home, Tasks, Projects, Events): the content is a sheet stacked under the header;
// scrolling it pushes the search block away and swaps it for the search icon in the header.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../screens';
import { renderApp } from './render';

const parts = container => ({
  scroller: container.querySelector('main.content'),
  block: container.querySelector('.stk-find'),
  icon: container.querySelector('.stk-find-ico'),
  screen: container.querySelector('.scr'),
});

/** Gives the search block 60 px and the pinned row 100 px tall / 60 px compact (jsdom has no layout), then re-measures. */
function foldPin(container, block) {
  const pin = container.querySelector('.stk-pin');
  Object.defineProperty(block, 'offsetHeight', { value: 60 }); // test-only
  Object.defineProperty(pin.firstElementChild, 'offsetHeight', { // test-only
    get: () => (pin.style.getPropertyValue('--stk-q') === '1' ? 60 : 100),
  });
  fireEvent(window, new Event('resize'));
  return pin;
}

describe('stacked tab screens', () => {
  it('scrolls the search block, the pinned stat row and the stacked sheet together under the greeting', () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block } = parts(container);
    expect(scroller).toHaveClass('stk-scroll');
    expect(block.parentElement).toBe(scroller);
    const pin = block.nextElementSibling;
    expect(pin).toHaveClass('stk-pin');
    expect(pin.querySelector('.stk-pin-in > .hm-stats').querySelectorAll('.hm-stat').length).toBeGreaterThan(0);
    expect(pin.nextElementSibling).toHaveClass('stk-sheet', 'has-pin');
    expect(pin.nextElementSibling.querySelector('.hm-stat')).toBeNull();
    expect(container.querySelector('.stk-head')).toHaveTextContent(/Nico|,/);
  });

  it('sticks the pinned row with the sheet edge under the header without anchoring the scroll to it', () => {
    const css = readFileSync(join(__dirname, '../kit/stacked.css'), 'utf8');
    const rule = sel => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
    // Sticks at the top, so its top edge never waits on the main thread's --stk-q (that made it shake under the header)
    expect(rule('.stk-pin')).toMatch(/position: sticky; top: 0;/);
    expect(rule('.stk-pin')).toMatch(/height: var\(--stk-pin-h, auto\)/);
    // The folded-away part below the chips is see-through to taps; the chips themselves stay tappable
    expect(rule('.stk-pin')).toMatch(/pointer-events: none/);
    expect(rule('.stk-pin-in')).toMatch(/pointer-events: auto/);
    expect(rule('.stk-pin-in')).toMatch(/border-radius: 24px 24px 0 0/);
    expect(rule('.stk-pin-in')).toMatch(/border-top: 1px solid var\(--separator\)/);
    // The sheet's canvas runs up under the row's see-through fold, so the seam between them never shows the surface
    expect(rule('.stk-sheet.has-pin')).toMatch(/margin-top: calc\(-1 \* var\(--sp-6\)\); padding-top: calc\(var\(--sp-6\) \+ var\(--sp-2\)\)/);
    // The sheet itself has no edge any more: the sticky pin (or .stk-edge) carries it
    expect(rule('.stk-sheet')).not.toMatch(/border-top|border-radius/);
    // The fold is driven by scrollTop: the browser must not move the scroll when heights above the content change
    expect(rule('.content.with-tabbar.stk-scroll')).toMatch(/overflow-anchor: none/);
  });

  it('sticks the bare sheet edge of Tasks, Projects and Events under the header, see-through to taps', () => {
    const css = readFileSync(join(__dirname, '../kit/stacked.css'), 'utf8');
    const rule = sel => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
    expect(rule('.stk-edge')).toMatch(/position: sticky; top: 0;/);
    // 12 px of the 16 px gap: the last 4 px stay clear for a first row reaching up into it (Projects people row)
    expect(rule('.stk-edge')).toMatch(/height: var\(--sp-3\)/);
    expect(rule('.stk-sheet')).toMatch(/padding: var\(--sp-1\) var\(--sp-4\)/);
    expect(rule('.stk-edge')).toMatch(/pointer-events: none/);
    expect(rule('.stk-edge::before')).toMatch(/border-radius: 24px 24px 0 0/);
    expect(rule('.stk-edge::before')).toMatch(/border-top: 1px solid var\(--separator\)/);
    // Opaque part measured from the border box, so it ends with the 12 px edge instead of 1 px past it (under the hairline)
    expect(rule('.stk-edge::before')).toMatch(/linear-gradient\(var\(--bg\) var\(--sp-3\), transparent 0\) border-box/);
    // Corner fill lifted so it stops at the box's bottom: below it, the clip's edge drew a line across the avatars
    expect(rule('.stk-edge::before')).toMatch(/box-shadow: 0 -24px 0 24px var\(--surface\)/);
  });

  it('compacts the pinned stat row step by step with the scroll past the search, and back', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block, screen } = parts(container);
    const pin = foldPin(container, block);
    expect(screen.style.getPropertyValue('--stk-pin-h')).toBe('100px');
    for (const [top, q] of [[30, '0.000'], [60, '0.000'], [70, '0.250'], [80, '0.500'], [100, '1.000'], [200, '1.000'], [90, '0.750'], [0, '0.000']]) {
      scroller.scrollTop = top;
      fireEvent.scroll(scroller);
      await waitFor(() => expect(screen.style.getPropertyValue('--stk-q')).toBe(q));
    }
    // The chips keep label, count and sub line in the DOM; the compact form is CSS only
    expect(pin.querySelector('.hm-stat .hm-sub')).toBeInTheDocument();
  });

  it('snaps a touch scroll left part way through the row fold to the nearer end, but never a wheel scroll', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block } = parts(container);
    foldPin(container, block);
    scroller.scrollTo = vi.fn();
    const swipeTo = top => { fireEvent.touchStart(scroller); scroller.scrollTop = top; fireEvent.scroll(scroller); fireEvent.touchEnd(scroller); };
    swipeTo(75);
    await waitFor(() => expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'smooth' }));
    scroller.scrollTo.mockClear();
    swipeTo(85);
    await waitFor(() => expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' }));
    scroller.scrollTo.mockClear();
    scroller.scrollTop = 75;
    fireEvent.scroll(scroller);
    await new Promise(r => setTimeout(r, 200));
    expect(scroller.scrollTo).not.toHaveBeenCalled();
  });

  it('starts with the search bar reachable and the header icon hidden', () => {
    const { container } = renderApp('home.main', 'member');
    const { block, icon, screen } = parts(container);
    expect(block).not.toHaveAttribute('inert');
    expect(icon).toHaveAttribute('inert');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.style.getPropertyValue('--stk-p')).toBe('0.000');
  });

  it('collapses the search bar into the header icon once the sheet is scrolled over it', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block, icon, screen } = parts(container);
    // jsdom has no layout: the block's height is 0, so progress is scrollTop over 1 px and any scroll past 1 collapses it
    scroller.scrollTop = 0.3;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(screen.style.getPropertyValue('--stk-p')).toBe('0.300'));
    expect(icon).toHaveAttribute('inert');
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(icon).not.toHaveAttribute('inert'));
    expect(block).toHaveAttribute('inert');
    expect(screen.style.getPropertyValue('--stk-p')).toBe('1.000');
  });

  it('opens Search from the header icon', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, icon } = parts(container);
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(icon).not.toHaveAttribute('inert'));
    fireEvent.click(icon);
    expect(window.location.hash).toBe('#home.search');
    expect(container.querySelector('.stk-find')).toBeNull();
  });

  it('snaps a half-collapsed search bar open or shut once a touch scroll comes to rest, but not while a finger is down', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block } = parts(container);
    Object.defineProperty(block, 'offsetHeight', { value: 60 }); // test-only: jsdom has no layout
    scroller.scrollTo = vi.fn();
    const stopAt = top => { scroller.scrollTop = top; fireEvent.scroll(scroller); };
    const swipeTo = top => { fireEvent.touchStart(scroller); stopAt(top); fireEvent.touchEnd(scroller); };

    swipeTo(20);
    await waitFor(() => expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' }));
    scroller.scrollTo.mockClear();
    swipeTo(40);
    await waitFor(() => expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'smooth' }));

    scroller.scrollTo.mockClear();
    fireEvent.touchStart(scroller);
    stopAt(25);
    await new Promise(r => setTimeout(r, 200));
    expect(scroller.scrollTo).not.toHaveBeenCalled();
    fireEvent.touchEnd(scroller);
    await waitFor(() => expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' }));
  });

  it('never snaps a wheel or trackpad scroll, however long it pauses part way', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block, screen } = parts(container);
    Object.defineProperty(block, 'offsetHeight', { value: 60 }); // test-only: jsdom has no layout
    scroller.scrollTo = vi.fn();
    for (const top of [10, 20, 40]) {
      scroller.scrollTop = top;
      fireEvent.scroll(scroller);
      await new Promise(r => setTimeout(r, 200));   // a slow scroll: longer than the snap's quiet time between steps
      expect(scroller.scrollTo).not.toHaveBeenCalled();
    }
    expect(screen.style.getPropertyValue('--stk-p')).toBe((40 / 60).toFixed(3));
  });

  it('snaps only the touch scroll that just ended, not a later wheel scroll', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block } = parts(container);
    Object.defineProperty(block, 'offsetHeight', { value: 60 }); // test-only: jsdom has no layout
    scroller.scrollTo = vi.fn();
    fireEvent.touchStart(scroller);
    fireEvent.touchEnd(scroller);   // a tap at the top: nothing to snap
    await new Promise(r => setTimeout(r, 200));
    scroller.scrollTop = 20;
    fireEvent.scroll(scroller);
    await new Promise(r => setTimeout(r, 200));
    expect(scroller.scrollTo).not.toHaveBeenCalled();
  });

  it('leaves the scroll alone outside the search block', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block } = parts(container);
    Object.defineProperty(block, 'offsetHeight', { value: 60 }); // test-only: jsdom has no layout
    scroller.scrollTo = vi.fn();
    fireEvent.touchStart(scroller);
    scroller.scrollTop = 300;
    fireEvent.scroll(scroller);
    fireEvent.touchEnd(scroller);
    await new Promise(r => setTimeout(r, 200));
    expect(scroller.scrollTo).not.toHaveBeenCalled();
  });

  it.each([
    ['tasks.my', 'Tasks', 'Search title, #number, or tag…'],
    ['tasks.board', 'Tasks', 'Search title, #number, or tag…'],
    ['projects.list', 'Projects', 'Search project name or description…'],
    ['events.list', 'Events', 'Search title or location…'],
    ['events.calendar', 'Events', 'Search title or location…'],
  ])('stacks %s under a "%s" header with its search and filter in the folding block', (id, title, placeholder) => {
    const { container } = renderApp(id, 'pm');
    const { scroller, block } = parts(container);
    expect(scroller).toHaveClass('stk-scroll');
    expect(within(container.querySelector('.stk-head')).getByRole('heading', { level: 1 })).toHaveTextContent(title);
    expect(within(block).getByPlaceholderText(placeholder)).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Filter and sort' })).toBeInTheDocument();
    // No pinned row: a bare edge sticks under the header in its place, ahead of the sheet
    const edge = block.nextElementSibling;
    expect(edge).toHaveClass('stk-edge');
    expect(edge).toHaveAttribute('aria-hidden', 'true');
    expect(edge).toBeEmptyDOMElement();
    expect(edge.nextElementSibling).toHaveClass('stk-sheet');
    expect(edge.nextElementSibling).not.toHaveClass('has-pin');
  });

  it('opens the sheet on the view switches (Tasks, Events) or the people row (Projects)', () => {
    const first = id => {
      const { container, unmount } = renderApp(id, 'pm');
      return [container.querySelector('.stk-sheet').firstElementChild, unmount];
    };
    let [el, unmount] = first('tasks.all');
    expect(within(el).getByRole('tab', { name: 'All tasks' })).toHaveAttribute('aria-selected', 'true');
    expect(within(el).getByRole('tab', { name: 'List' })).toBeInTheDocument();
    unmount();
    [el, unmount] = first('events.calendar');
    expect(within(el).getByRole('tab', { name: 'Calendar' })).toHaveAttribute('aria-selected', 'true');
    unmount();
    [el] = first('projects.list');
    expect(el).toHaveAttribute('aria-label', 'Show projects of');
  });

  it('brings the search of a tab back from the header icon and focuses its field', async () => {
    const { container } = renderApp('tasks.my', 'member');
    const { scroller, block, icon } = parts(container);
    // test-only: jsdom has no smooth scroll; land at once like reduced motion
    scroller.scrollTo = vi.fn(({ top }) => { scroller.scrollTop = top; fireEvent.scroll(scroller); });
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(icon).not.toHaveAttribute('inert'));
    fireEvent.click(icon);
    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    await waitFor(() => expect(block).not.toHaveAttribute('inert'));
    expect(document.activeElement).toBe(block.querySelector('input'));
    expect(window.location.hash).toBe('#tasks.my');
  });

  it('keeps other screens on the plain content frame', () => {
    const { container } = renderApp('tasks.detail-todo', 'member');
    expect(container.querySelector('main.content')).not.toHaveClass('stk-scroll');
    expect(container.querySelector('.react-cupertino-ui-navigation-bar')).toBeInTheDocument();
  });
});
