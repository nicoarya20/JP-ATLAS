// Theme switcher: ClickUp "Customize › Themes" (Appearance Light/Dark/Auto + accent), kept in the URL next to role.
// Loads in <head> before the kit so <html data-theme/data-accent> is set before first paint (no flash).
(() => {
  const ACCENTS = [['black', 'Black'], ['purple', 'Purple'], ['blue', 'Blue'], ['pink', 'Pink'], ['violet', 'Violet'],
    ['indigo', 'Indigo'], ['orange', 'Orange'], ['teal', 'Teal'], ['bronze', 'Bronze'], ['mint', 'Mint']];
  const MODES = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']];
  const DEFAULTS = { mode: 'light', accent: 'purple' };

  // Guards keep the module loadable in the node smoke stub, where these may be missing.
  const doc = typeof document === 'object' ? document : null;
  const root = doc && doc.documentElement && doc.documentElement.dataset ? doc.documentElement : null;
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

  // Panel collapse is a per-viewer convenience, remembered in localStorage when available.
  const OPEN_KEY = 'wfm.themeSwitch.open';
  const readOpen = () => {
    try { return typeof localStorage === 'object' ? localStorage.getItem(OPEN_KEY) !== '0' : true; }
    catch (err) { return true; } // storage blocked (private mode / file://): default to open
  };
  const writeOpen = open => {
    try { if (typeof localStorage === 'object') localStorage.setItem(OPEN_KEY, open ? '1' : '0'); }
    catch (err) { /* storage blocked: collapse still works for this page view, just not remembered */ }
  };

  const pick = (list, v, fallback) => (list.some(([k]) => k === v) ? v : fallback);
  const query = () => new URLSearchParams(typeof location === 'object' ? location.search : '');
  const q = query();
  const state = { mode: pick(MODES, q.get('mode'), DEFAULTS.mode), accent: pick(ACCENTS, q.get('accent'), DEFAULTS.accent), open: readOpen() };

  /** Light/dark actually shown: 'auto' follows the OS preference. */
  const resolve = mode => (mode === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : mode);

  function apply() {
    if (!root) return;
    root.dataset.theme = resolve(state.mode);
    root.dataset.accent = state.accent;
  }

  // Rewrite only mode/accent; role, other params and the hash stay as the router left them.
  function writeUrl() {
    if (typeof history !== 'object' || typeof location !== 'object' || !history.replaceState) return;
    const params = query();
    params.set('mode', state.mode);
    params.set('accent', state.accent);
    history.replaceState(null, '', `?${params}${location.hash || ''}`);
  }

  const Theme = {
    ACCENTS,
    MODES,
    /** Chosen appearance: 'light' | 'dark' | 'auto'. */
    get mode() { return state.mode; },
    /** Chosen accent key, e.g. 'purple'. */
    get accent() { return state.accent; },
    /** Appearance in effect after resolving 'auto': 'light' | 'dark'. */
    get resolved() { return resolve(state.mode); },
    /** Change mode and/or accent; unknown values are ignored. Updates <html>, the URL and the switcher UI. */
    set({ mode, accent } = {}) {
      state.mode = pick(MODES, mode, state.mode);
      state.accent = pick(ACCENTS, accent, state.accent);
      apply();
      writeUrl();
      render();
      return { mode: state.mode, accent: state.accent };
    },
  };

  // Mini preview tile: one pane per tone (Auto = light + dark side by side).
  const pane = tone => `<span class="ts-pane" data-tone="${tone}"><b></b><span><i></i><i></i><i></i></span></span>`;
  const tile = mode => `<span class="ts-tile">${mode === 'auto' ? pane('light') + pane('dark') : pane(mode)}</span>`;

  function render() {
    const host = doc && doc.querySelector && doc.querySelector('.index .theme-switch');
    if (!host) return;
    const nameOf = (list, k) => list.find(([key]) => key === k)[1];
    host.innerHTML = `
      <button type="button" class="ts-head" data-ts-toggle aria-expanded="${state.open}">
        <span>Customize</span><small>${nameOf(MODES, state.mode)} · ${nameOf(ACCENTS, state.accent)}</small><em aria-hidden="true">▾</em>
      </button>
      <div class="ts-body"${state.open ? '' : ' hidden'}>
      <div class="ts-label">Appearance</div>
      <div class="ts-modes">${MODES.map(([k, label]) =>
        `<button type="button" class="ts-mode" data-ts-mode="${k}" aria-pressed="${k === state.mode}">${tile(k)}<span>${label}</span></button>`).join('')}</div>
      <div class="ts-label">Theme</div>
      <div class="ts-accents">${ACCENTS.map(([k, label]) =>
        `<button type="button" class="ts-accent" data-ts-accent="${k}" aria-pressed="${k === state.accent}"><i data-accent="${k}">${k === state.accent ? '✓' : ''}</i><span>${label}</span></button>`).join('')}</div>
      </div>`;
  }

  function onClick(e) {
    const btn = e.target.closest('[data-ts-mode],[data-ts-accent],[data-ts-toggle]');
    if (!btn) return;
    if ('tsToggle' in btn.dataset) {
      state.open = !state.open;
      writeOpen(state.open);
      render();
      return;
    }
    Theme.set({ mode: btn.dataset.tsMode, accent: btn.dataset.tsAccent });
  }

  apply();
  if (mq) {
    const follow = () => { if (state.mode === 'auto') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', follow);
    else if (mq.addListener) mq.addListener(follow); // Safari < 14
  }
  if (doc && doc.addEventListener) {
    const mount = () => {
      const host = doc.querySelector && doc.querySelector('.index .theme-switch');
      if (host && host.addEventListener) host.addEventListener('click', onClick);
      render();
    };
    if (doc.readyState && doc.readyState !== 'loading') mount();
    else doc.addEventListener('DOMContentLoaded', mount);
  }
  window.Theme = Theme;
})();
