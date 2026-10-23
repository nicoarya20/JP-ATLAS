// Screen/sheet registry. Screen modules call screen()/sheet() at import time; the router and the index read from here.
const screens = new Map(); // id -> {title, group, roles?, modal?, Component}
const sheets = new Map();  // id -> {title, group, roles?, snap?, full?, fit?, Component}

function register(map, kind, id, def) {
  if (screens.has(id) || sheets.has(id)) throw new Error(`Duplicate ${kind} id "${id}"`);
  if (typeof def?.Component !== 'function') throw new Error(`${kind} "${id}" needs a Component`);
  map.set(id, def);
}

/** Register a full screen. def: {title (string | () => string), group, roles?: ['pm', ...], modal?: true, Component}.
 *  modal = a create/edit flow: slides up over the screen it opened from, a down chevron (named Cancel) instead of the left one, slides down on back. */
export const screen = (id, def) => register(screens, 'screen', id, def);
/** Register a bottom sheet. def: same as a screen, plus from: the screen id it opens over (a link to the sheet starts
 *  there and opens the sheet on top), snap?: 0..1 (how far a drag must pull it down to close, default 0.6; the sheet
 *  itself sizes to its content), or full?: true for a full-height overlay (kit FullSheet: X top-left, swipe down to
 *  close; snap is ignored), plus fit?: true to size that overlay to its content instead of the full height. */
export const sheet = (id, def) => register(sheets, 'sheet', id, def);

const panels = new Map();  // tab id -> {Component({close})}

/** Register what a tab unfolds from the tab bar instead of opening a screen (the More menu). def: {Component}. */
export function panel(tab, def) {
  if (panels.has(tab)) throw new Error(`Duplicate panel for tab "${tab}"`);
  if (typeof def?.Component !== 'function') throw new Error(`panel "${tab}" needs a Component`);
  panels.set(tab, def);
}
export const getPanel = tab => panels.get(tab);

export const getScreen = id => screens.get(id);
export const getSheet = id => sheets.get(id);
export const exists = id => screens.has(id) || sheets.has(id);

/** True when the id exists and the role may open it (no `roles` = every role). */
export function allowed(id, role) {
  const d = screens.get(id) || sheets.get(id);
  return !!d && (!d.roles || d.roles.includes(role));
}

/** Where the app starts for a link to id: {screen, sheet}. A sheet starts on its `from` screen with the sheet open on
 *  top (a sheet id as the first screen rendered nothing); an id the role may not open falls back to `fallback`. */
export function startFor(id, role, fallback) {
  const sh = sheets.get(id);
  if (sh) return allowed(id, role) && allowed(sh.from, role) ? { screen: sh.from, sheet: id } : { screen: fallback, sheet: null };
  return { screen: screens.has(id) && allowed(id, role) ? id : fallback, sheet: null };
}

/** Every id the role may open, grouped for the index: {group: [{id, title, sheet}]}, in registration order. */
export function grouped(role) {
  const out = {};
  for (const [map, isSheet] of [[screens, false], [sheets, true]]) {
    for (const [id, d] of map) {
      if (!allowed(id, role)) continue;
      const title = typeof d.title === 'function' ? d.title() : d.title;
      (out[d.group || 'Other'] ||= []).push({ id, title: title || id, sheet: isSheet });
    }
  }
  return out;
}

/** All registered ids (screens then sheets). */
export const ids = () => [...screens.keys(), ...sheets.keys()];
