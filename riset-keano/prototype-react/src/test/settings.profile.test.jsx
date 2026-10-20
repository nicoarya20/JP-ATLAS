// Edit profile (settings.profile): no phone number, read-only role and email, every field a labelled filled box.
// Settings (settings.main): title only, no subtitle.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { renderApp } from './render';

describe('Edit profile', () => {
  it('drops the phone number and shows the role read-only', () => {
    renderApp('settings.profile', 'member');
    expect(dom.queryByLabelText('Phone number')).not.toBeInTheDocument();
    const role = dom.getByLabelText('Role');
    expect(role).toHaveValue(D.me().role);
    expect(role).toBeDisabled();
    expect(dom.getByText('Your role is set by an Admin.')).toBeInTheDocument();
  });

  it('keeps name fields editable and email read-only', () => {
    renderApp('settings.profile', 'pm');
    expect(dom.getByLabelText('Full name')).toHaveValue(D.me().full);
    expect(dom.getByLabelText('Full name')).toBeEnabled();
    expect(dom.getByLabelText('Email')).toBeDisabled();
  });

  it('draws every field as a filled box with its label outside it', () => {
    renderApp('settings.profile', 'pm');
    const boxes = document.querySelectorAll('.react-cupertino-ui-textfield');
    expect(boxes.length).toBe(6);
    boxes.forEach(box => {
      expect(box).toHaveClass('variant-filled');
      expect(box).not.toHaveClass('variant-glass'); // glass adds a gradient highlight and a light edge
    });
    expect(document.querySelector('.react-cupertino-ui-textfield__label')).toBeNull();
  });
});

describe('no phone number anywhere', () => {
  it('is not asked for or shown on the pending profile, Settings or user approval', () => {
    expect(Object.values(D.people).some(p => 'phone' in p)).toBe(false);
    for (const [id, role] of [['auth.pending', 'member'], ['settings.main', 'pm'], ['users.approve', 'admin']]) {
      const { unmount } = renderApp(id, role);
      expect(document.body.textContent).not.toMatch(/phone|08\d\d/i);
      unmount();
    }
  });
});

describe('Settings', () => {
  it('shows only the title, without a subtitle, for every role', () => {
    for (const role of ['member', 'pm', 'admin']) {
      const { unmount } = renderApp('settings.main', role);
      expect(dom.getAllByText('Settings').length).toBeGreaterThan(0);
      expect(dom.queryByText(/^Manage your account/)).not.toBeInTheDocument();
      unmount();
    }
  });
});
