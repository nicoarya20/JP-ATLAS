// Router: screen registry, history stack, bottom sheets, role switch, and click delegation via data-* attributes.
(() => {
  const screens = {};   // id -> {title, group, roles, render}
  const sheets = {};    // id -> {title, group, roles, render}
  const stack = [];
  const ROLES = { member: 'Member', pm: 'Project Manager', admin: 'Admin' };
  let phone, scrim, sheetEl, toastEl, toastTimer;

  const App = {
    ROLES,
    /** Active role: 'member' | 'pm' | 'admin'. Screens branch on it; the index hides screens the role can't open. */
    role: 'pm',
    /** True when the active role is one of the given roles. */
    is: (...roles) => roles.includes(App.role),
    /** Register a full screen. def: {title (string or () => string), group, roles?: [...], render: () => html}. */
    screen: (id, def) => { screens[id] = def; },
    /** Register a bottom sheet. def: same shape as a screen. */
    sheet: (id, def) => { sheets[id] = def; },
    /** True when the screen/sheet exists and the active role may open it (no `roles` = every role). */
    allowed(id) {
      const d = screens[id] || sheets[id];
      return !!d && (!d.roles || d.roles.includes(App.role));
    },

    go(id, replace = false) {
      if (!screens[id] && !sheets[id]) { App.toast(`Screen "${id}" not built yet`); return; }
      if (!App.allowed(id)) { App.toast(`Not available for ${ROLES[App.role]}`); return; }
      if (sheets[id]) return App.openSheet(id);
      App.closeSheet();
      if (replace) stack.length = 0;
      if (stack[stack.length - 1] !== id) stack.push(id);
      render(id);
    },
    back() {
      if (sheetEl.classList.contains('open')) return App.closeSheet();
      if (stack.length > 1) stack.pop();
      render(stack[stack.length - 1]);
    },
    openSheet(id) {
      if (!sheets[id]) { App.toast(`Sheet "${id}" not built yet`); return; }
      if (!App.allowed(id)) { App.toast(`Not available for ${ROLES[App.role]}`); return; }
      sheetEl.innerHTML = sheets[id].render();
      scrim.classList.add('open'); sheetEl.classList.add('open');
    },
    closeSheet() { scrim.classList.remove('open'); sheetEl.classList.remove('open'); },
    toast(msg) {
      toastEl.textContent = msg; toastEl.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
    },
    /** Switch role: rebuild the index, drop screens the new role can't open, re-render (or fall back to Home). */
    setRole(r) {
      if (!ROLES[r]) { App.toast(`Unknown role "${r}"`); return; }
      App.role = r;
      App.closeSheet();
      const keep = stack.filter(App.allowed);
      stack.splice(0, stack.length, ...keep);
      buildIndex();
      if (stack.length) render(stack[stack.length - 1]);
      else App.go('home.main', true);
    },
  };

  function render(id) {
    phone.querySelector('.screen').innerHTML = screens[id].render();
    // Role lives in the query string so a copied link opens the same role; other params (theme mode/accent) are kept.
    const q = new URLSearchParams(location.search);
    q.set('role', App.role);
    history.replaceState(null, '', `?${q}#${id}`);
    document.querySelectorAll('.index a').forEach(a => a.setAttribute('aria-current', a.dataset.go === id));
  }

  function buildIndex() {
    document.querySelector('.index .role-note').textContent = `Role: ${ROLES[App.role]} · sample data`;
    document.querySelector('.index .role-switch').innerHTML = Object.entries(ROLES).map(([r, label]) =>
      `<button data-role="${r}"${r === App.role ? ' aria-pressed="true"' : ''}>${label}</button>`).join('');
    const groups = {};
    for (const [id, d] of [...Object.entries(screens), ...Object.entries(sheets)]) {
      if (!App.allowed(id)) continue;
      const title = typeof d.title === 'function' ? d.title() : d.title;
      (groups[d.group || 'Other'] ||= []).push([id, title || id, !!sheets[id]]);
    }
    const current = stack[stack.length - 1];
    document.querySelector('.index nav').innerHTML = Object.entries(groups).map(([g, list]) =>
      `<h2>${g}</h2>${list.map(([id, t, isSheet]) =>
        `<a href="#${id}" data-go="${id}"${isSheet ? '' : ' data-replace'} aria-current="${id === current}">${t}${isSheet ? ' (sheet)' : ''}</a>`).join('')}`).join('');
  }

  document.addEventListener('click', e => {
    const role = e.target.closest('[data-role]');
    if (role) return App.setRole(role.dataset.role);
    const single = e.target.closest('[data-single] > *');
    if (single) [...single.parentElement.children].forEach(c => c.classList.toggle('on', c === single));
    const el = e.target.closest('[data-go],[data-sheet],[data-back],[data-close],[data-toast]');
    if (!el) return;
    e.preventDefault();
    if (el.dataset.toast) App.toast(el.dataset.toast);
    if (el.hasAttribute('data-close')) App.closeSheet();
    if (el.hasAttribute('data-back')) App.back();
    if (el.dataset.sheet) App.openSheet(el.dataset.sheet);
    if (el.dataset.go) App.go(el.dataset.go, el.hasAttribute('data-replace'));
  });

  window.addEventListener('DOMContentLoaded', () => {
    phone = document.querySelector('.phone');
    scrim = phone.querySelector('.scrim'); sheetEl = phone.querySelector('.sheet'); toastEl = phone.querySelector('.toast');
    scrim.addEventListener('click', App.closeSheet);
    const r = new URLSearchParams(location.search).get('role');
    if (ROLES[r]) App.role = r;
    buildIndex();
    const start = location.hash.slice(1);
    App.go(screens[start] && App.allowed(start) ? start : 'auth.login', true);
  });
  window.App = App;
})();
