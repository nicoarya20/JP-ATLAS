// Test helper: mount the phone app for a role at a start screen (screens must already be registered).
import { render } from '@testing-library/react';
import { AppProvider } from '../core/app.context';
import { PhoneApp } from '../core/PhoneApp';
import { setRole } from '../core/session';

/** Render the full phone app as `role`, starting on screen `start`. */
export function renderApp(start, role = 'pm') {
  setRole(role);
  return render(<AppProvider start={start}><PhoneApp /></AppProvider>);
}
