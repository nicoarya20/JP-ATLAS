// Prototype session: the active role and theme mode, read once from the URL (?role=pm&mode=dark#screen.id).
// The phone app never switches role in place: the index reloads the phone frame with a new ?role=.
export const ROLES = { member: 'Member', pm: 'Project Manager', admin: 'Admin' };
export const MODES = { light: 'Light', dark: 'Dark' };
export const DEFAULT_ROLE = 'pm';
export const START_SCREEN = 'auth.login';

let role = DEFAULT_ROLE;

/** Active role: 'member' | 'pm' | 'admin'. */
export const getRole = () => role;

/** Set the active role (unknown values fall back to the default). Called by the app shell and tests. */
export function setRole(next) {
  role = ROLES[next] ? next : DEFAULT_ROLE;
  return role;
}

/** Role, mode and start screen id from a location-like object. */
export function readUrl(loc = window.location) {
  const q = new URLSearchParams(loc.search);
  const r = q.get('role');
  const m = q.get('mode');
  return {
    role: ROLES[r] ? r : DEFAULT_ROLE,
    mode: MODES[m] ? m : 'light',
    screen: decodeURIComponent(loc.hash.slice(1)) || START_SCREEN,
  };
}
