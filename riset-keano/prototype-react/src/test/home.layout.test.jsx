// Home layout: the content is a sheet stacked under the header; scrolling it pushes the search bar away and swaps it for
// the search icon beside the avatar.
import { describe, expect, it } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import '../screens';
import { renderApp } from './render';

const parts = container => ({
  scroller: container.querySelector('main.content'),
  block: container.querySelector('.hm-find'),
  icon: container.querySelector('.hm-find-ico'),
  screen: container.querySelector('.scr'),
});

describe('home layout', () => {
  it('scrolls the search block and the stacked sheet together under the greeting', () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block } = parts(container);
    expect(scroller).toHaveClass('hm-scroll');
    expect(block.parentElement).toBe(scroller);
    expect(block.nextElementSibling).toHaveClass('hm-sheet');
    expect(container.querySelector('.hm-head')).toHaveTextContent(/Nico|,/);
  });

  it('starts with the search bar reachable and the header icon hidden', () => {
    const { container } = renderApp('home.main', 'member');
    const { block, icon, screen } = parts(container);
    expect(block).not.toHaveAttribute('inert');
    expect(icon).toHaveAttribute('inert');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.style.getPropertyValue('--hm-p')).toBe('0.000');
  });

  it('collapses the search bar into the header icon once the sheet is scrolled over it', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, block, icon, screen } = parts(container);
    // jsdom has no layout: the block's height is 0, so progress is scrollTop over 1 px and any scroll past 1 collapses it
    scroller.scrollTop = 0.3;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(screen.style.getPropertyValue('--hm-p')).toBe('0.300'));
    expect(icon).toHaveAttribute('inert');
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(icon).not.toHaveAttribute('inert'));
    expect(block).toHaveAttribute('inert');
    expect(screen.style.getPropertyValue('--hm-p')).toBe('1.000');
  });

  it('opens Search from the header icon', async () => {
    const { container } = renderApp('home.main', 'member');
    const { scroller, icon } = parts(container);
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    await waitFor(() => expect(icon).not.toHaveAttribute('inert'));
    fireEvent.click(icon);
    expect(window.location.hash).toBe('#home.search');
    expect(container.querySelector('.hm-find')).toBeNull();
  });

  it('keeps other tab screens on the plain content frame', () => {
    const { container } = renderApp('tasks.my', 'member');
    expect(container.querySelector('main.content')).not.toHaveClass('hm-scroll');
  });
});
