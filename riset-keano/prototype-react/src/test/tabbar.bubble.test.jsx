// Tab bar bubble: a tap slides it to the tab with a bounce, a held finger drags it, release picks the nearest tab.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { renderApp } from './render';

const bar = () => dom.getByRole('tablist', { name: 'App navigation' });
const bubble = () => bar().querySelector('.tb-bubble');
const pos = name => bubble().style.getPropertyValue(name);
const lit = () => bar().querySelector('.tb-item.on').textContent;

// test-only layout: a 308px pill at x=0, so each of the 5 tabs is 60px wide inside the 4px padding.
const layOut = () => vi.spyOn(bar(), 'getBoundingClientRect').mockReturnValue({ left: 0, width: 308, top: 0, height: 58 });

describe('tab bar bubble', () => {
  it('rests behind the active tab', () => {
    renderApp('projects.list', 'pm');
    expect(pos('--tb-pos')).toBe('2');
    expect(bubble()).not.toHaveClass('is-settling');
    expect(lit()).toBe('Projects');
  });

  it('settles on a tapped tab with a bounce', async () => {
    renderApp('home.main', 'member');
    await userEvent.click(dom.getByRole('tab', { name: 'Events' }));
    expect(window.location.hash).toBe('#events.list');
    expect(bubble()).toHaveClass('is-settling');
    expect(pos('--tb-pos')).toBe('3');
  });

  it('bounces in place when the active tab is tapped again', async () => {
    renderApp('tasks.my', 'member');
    await userEvent.click(dom.getByRole('tab', { name: 'Tasks' }));
    expect(window.location.hash).toBe('#tasks.my');
    expect(bubble()).toHaveClass('is-settling');
    // jsdom has no AnimationEvent, so React listens for the webkit-prefixed name there (browsers use animationend).
    fireEvent(bubble(), new Event('webkitAnimationEnd', { bubbles: true }));
    expect(bubble()).not.toHaveClass('is-settling');
  });

  it('jumps under the finger, follows a drag and opens the tab it is released on', () => {
    renderApp('home.main', 'pm');
    layOut();
    fireEvent.pointerDown(dom.getByRole('tab', { name: 'Home' }), { clientX: 94, button: 0, pointerId: 1 });
    expect(bubble()).toHaveClass('is-held');
    expect(pos('--tb-pos')).toBe('1');                 // finger on Tasks: the bubble jumps there at once
    fireEvent.pointerMove(bar(), { clientX: 214, pointerId: 1 });
    expect(bubble()).toHaveClass('is-dragging');
    expect(Number(pos('--tb-pos'))).toBeCloseTo(3);
    expect(lit()).toBe('Events');                      // the icon under the bubble lights up while dragging
    fireEvent.pointerUp(bar(), { clientX: 214, pointerId: 1 });
    expect(window.location.hash).toBe('#events.list');
    expect(bubble()).toHaveClass('is-settling');
    expect(Number(pos('--tb-from'))).toBeCloseTo(3);
  });

  it('keeps the bubble inside the pill when dragged past the edge', () => {
    renderApp('home.main', 'pm');
    layOut();
    fireEvent.pointerDown(bar(), { clientX: 30, button: 0, pointerId: 1 });
    fireEvent.pointerMove(bar(), { clientX: 900, pointerId: 1 });
    expect(pos('--tb-pos')).toBe('4');
    fireEvent.pointerCancel(bar(), { pointerId: 1 });
    expect(window.location.hash).toBe('#home.main');   // a cancelled drag goes back to the active tab
    expect(pos('--tb-from')).toBe('4');
  });

  it('moves between tabs with the arrow keys', () => {
    renderApp('home.main', 'member');
    act(() => dom.getByRole('tab', { name: 'Home' }).focus());
    fireEvent.keyDown(bar(), { key: 'ArrowLeft' });
    expect(window.location.hash).toBe('#home.more');
  });
});
