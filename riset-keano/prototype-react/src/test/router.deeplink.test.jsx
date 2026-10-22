// A link straight to a sheet (phone.html#tasks.filter, or an index link opened in a new tab) starts on the screen the
// sheet opens over, with the sheet on top. A sheet id used as the first screen used to render an empty page.
import { describe, expect, it } from 'vitest';
import { render, screen as dom } from '@testing-library/react';
import '../screens';
import { allowed, getScreen, getSheet, ids, startFor } from '../core/registry';
import { AppProvider } from '../core/app.context';
import { PhoneApp } from '../core/PhoneApp';
import { ROLES, START_SCREEN, setRole } from '../core/session';

const sheetIds = () => ids().filter(id => getSheet(id));

describe('sheet links', () => {
  it.each(sheetIds())('%s names a screen it opens over, open to every role that may open the sheet', id => {
    const { from } = getSheet(id);
    expect(getScreen(from), `${id} from ${from}`).toBeDefined();
    for (const role of Object.keys(ROLES)) if (allowed(id, role)) expect(allowed(from, role), `${role} ${from}`).toBe(true);
  });

  it('starts on the parent screen with the sheet open, and falls back for a role or id that may not open it', () => {
    expect(startFor('tasks.filter', 'member', START_SCREEN)).toEqual({ screen: 'tasks.all', sheet: 'tasks.filter' });
    expect(startFor('archive.delete', 'pm', START_SCREEN)).toEqual({ screen: START_SCREEN, sheet: null });
    expect(startFor('tasks.my', 'pm', START_SCREEN)).toEqual({ screen: 'tasks.my', sheet: null });
    expect(startFor('nope', 'pm', START_SCREEN)).toEqual({ screen: START_SCREEN, sheet: null });
  });

  it.each([['events.cancel', 'pm', 'Cancel event?'], ['settings.leave', 'member', 'Request leave'],
    ['projects.filter', 'admin', 'Filter & sort']])('opens %s on top of its screen as %s', (id, role, heading) => {
    setRole(role);
    const start = startFor(id, role, START_SCREEN);
    render(<AppProvider start={start.screen} sheet={start.sheet}><PhoneApp /></AppProvider>);
    expect(dom.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(document.querySelector('.scr')).toBeInTheDocument();   // the parent screen is drawn underneath
  });
});
