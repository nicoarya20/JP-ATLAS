// New project (choose method): leaving is the nav bar back chevron only, no extra Cancel button.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { renderApp } from './render';

describe('New project · choose method', () => {
  it('offers the three ways and no Cancel button', () => {
    renderApp('projects.new', 'pm');
    expect(dom.getAllByRole('button', { name: 'Choose' })).toHaveLength(3);
    expect(dom.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(dom.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });
});
