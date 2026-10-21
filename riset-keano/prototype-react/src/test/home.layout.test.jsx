// Home layout: the header stays on top and the content is drawn as a separate sheet stacked under it.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { renderApp } from './render';

describe('home layout', () => {
  it('puts the content in a stacked sheet after the header', () => {
    const { container } = renderApp('home.main', 'member');
    const sheet = container.querySelector('main.content');
    expect(sheet).toHaveClass('hm-sheet');
    expect(sheet.previousElementSibling).toHaveClass('hm-bar');
    expect(dom.getByRole('button', { name: /Search or ask anything/ })).toBeInTheDocument();
  });

  it('keeps other tab screens on the plain content frame', () => {
    const { container } = renderApp('tasks.my', 'member');
    expect(container.querySelector('main.content')).not.toHaveClass('hm-sheet');
  });
});
