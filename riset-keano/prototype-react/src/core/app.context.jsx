// App state for the phone: history stack, open bottom sheet, toast. Screens use useApp(); nav props go through useNav().
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { ROLES, getRole } from './session';
import { allowed, exists, getScreen, getSheet } from './registry';

/** Message types exchanged with the index page (parent window) via postMessage. */
export const MSG = { go: 'pm-proto:go', screen: 'pm-proto:screen' };
export const TOAST_MS = 1800;
/** How long a modal screen takes to slide down before it leaves the history (matches .scr.is-modal-closing). */
export const MODAL_CLOSE_MS = 380;

const AppContext = createContext(null);

function reducer(state, a) {
  switch (a.type) {
    case 'push': {
      // replace = start a new history; top = swap only the current screen (the same item opening on another screen).
      const stack = a.replace ? [] : a.top ? state.stack.slice(0, -1) : state.stack.slice();
      const top = stack[stack.length - 1];
      if (top?.id === a.id) stack[stack.length - 1] = { id: a.id, params: a.params };
      else stack.push({ id: a.id, params: a.params });
      return { ...state, stack, sheet: null, closing: false };
    }
    case 'pop':
      return state.stack.length > 1 ? { ...state, stack: state.stack.slice(0, -1), closing: false } : state;
    case 'closing':
      return { ...state, closing: true };
    case 'sheet':
      return { ...state, sheet: a.sheet };
    case 'toast':
      return { ...state, toast: a.toast };
    default:
      throw new Error(`Unknown app action "${a.type}"`);
  }
}

/** Provides navigation state. start = first screen id, sheet = a sheet id open on top of it (both already validated
 *  by the caller, see registry startFor). */
export function AppProvider({ start, sheet = null, children }) {
  const [state, dispatch] = useReducer(reducer,
    { stack: [{ id: start, params: {} }], sheet: sheet && { id: sheet, params: {} }, toast: null, closing: false });
  const role = getRole();

  const toast = useCallback(msg => dispatch({ type: 'toast', toast: { msg, key: Date.now() + Math.random() } }), []);
  const clearToast = useCallback(() => dispatch({ type: 'toast', toast: null }), []);
  const closeSheet = useCallback(() => dispatch({ type: 'sheet', sheet: null }), []);

  /** Guard shared by go/openSheet: returns an error toast text, or '' when the id may open. */
  const refuse = useCallback(id => {
    if (!exists(id)) return `Screen "${id}" not built yet`;
    if (!allowed(id, role)) return `Not available for ${ROLES[role]}`;
    return '';
  }, [role]);

  const openSheet = useCallback((id, params = {}) => {
    const why = refuse(id);
    if (why) return toast(why);
    if (!getSheet(id)) return toast(`Sheet "${id}" not built yet`);
    dispatch({ type: 'sheet', sheet: { id, params } });
  }, [refuse, toast]);

  /** Open a screen (or a sheet when the id is a sheet). opts: {replace: reset history, top: swap the current screen, params: passed to the screen}. */
  const go = useCallback((id, { replace = false, top = false, params = {} } = {}) => {
    const why = refuse(id);
    if (why) return toast(why);
    if (getSheet(id)) return openSheet(id, params);
    dispatch({ type: 'push', id, params, replace, top });
  }, [refuse, toast, openSheet]);

  const top = state.stack[state.stack.length - 1];
  const depth = state.stack.length;

  /** Close the open sheet, else pop one screen. skipSheet: always pop (used when a button also closes the sheet).
   *  A modal screen with history under it slides down first (closing), then pops. */
  const back = useCallback(({ skipSheet = false } = {}) => {
    if (state.sheet && !skipSheet) return closeSheet();
    if (state.closing) return;
    if (getScreen(top.id)?.modal && depth > 1) return dispatch({ type: 'closing' });
    dispatch({ type: 'pop' });
  }, [state.sheet, state.closing, closeSheet, top.id, depth]);

  useEffect(() => {
    if (!state.closing) return undefined;
    const t = setTimeout(() => dispatch({ type: 'pop' }), MODAL_CLOSE_MS);
    return () => clearTimeout(t);
  }, [state.closing]);
  const value = useMemo(() => ({
    role, is: (...roles) => roles.includes(role), current: top.id, params: top.params, depth,
    under: depth > 1 ? state.stack[depth - 2] : null, closing: state.closing,
    sheet: state.sheet, toastState: state.toast, go, back, openSheet, closeSheet, toast, clearToast,
  }), [role, top, depth, state.stack, state.closing, state.sheet, state.toast, go, back, openSheet, closeSheet, toast, clearToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Render children as if `entry` ({id, params}) were the current screen: the screen drawn under a modal one. */
export function AsCurrent({ entry, children }) {
  const app = useApp();
  const value = useMemo(() => ({ ...app, current: entry.id, params: entry.params }), [app, entry]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Navigation + role API for screens: {role, is(), current, params, go(id, {replace, top, params}), back(), openSheet(id, params), closeSheet(), toast(msg), depth, under, closing}. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() must be used inside <AppProvider>');
  return ctx;
}

/**
 * Turn kit nav props into a click handler, same order as the old data-* delegation: toast, close, back, sheet, go.
 * props: {go, sheet, back, close, toast, replace, task, params}. task = D.tasks number the target detail should show.
 * Returns undefined when the props hold no action (so the element renders as static).
 */
export function useNav({ go, sheet, back, close, toast, replace, task, params } = {}) {
  const app = useApp();
  if (!go && !sheet && !back && !close && !toast) return undefined;
  const p = task != null ? { ...params, task } : params || {};
  // Innermost wins: a button inside a tappable row/card must not also fire the row's action.
  return e => {
    e?.stopPropagation();
    if (toast) app.toast(toast);
    if (close) app.closeSheet();
    if (back) app.back({ skipSheet: !!close });
    if (sheet) app.openSheet(sheet, p);
    if (go) app.go(go, { replace: !!replace, params: p });
  };
}
