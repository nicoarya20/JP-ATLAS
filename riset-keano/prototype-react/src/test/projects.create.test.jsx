// New project (choose method): leaving is the nav bar back chevron only, no extra Cancel button.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { renderApp } from './render';

describe('New project · choose method', () => {
  it('offers the three ways; the only way out is the modal Cancel in the nav bar', () => {
    renderApp('projects.new', 'pm');
    expect(dom.getAllByRole('button', { name: 'Choose' })).toHaveLength(3);
    expect(dom.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
    expect(dom.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });
});
