// UI kit: small HTML-string builders shared by every screen module. Sample data lives in data.sample.js (window.D).
(() => {
  const attrs = (o = {}) =>
    (o.go ? ` data-go="${o.go}"` : '') + (o.task ? ` data-task="${o.task}"` : '') + (o.sheet ? ` data-sheet="${o.sheet}"` : '') +
    (o.replace ? ' data-replace' : '') + (o.back ? ' data-back' : '') + (o.close ? ' data-close' : '') + (o.toast ? ` data-toast="${o.toast}"` : '');

  const UI = {
    attrs,
    /** Gray text bar. size: '' | 'sm' | 'lg' | 'xl'. */
    ph: (w = '60%', size = '') => `<span class="ph ${size}" style="--w:${w}"></span>`,
    /** Several gray lines; widths array or count. */
    lines: (ws = ['90%', '70%']) =>
      `<div class="lines">${(Array.isArray(ws) ? ws : Array(ws).fill('85%')).map(w => UI.ph(w)).join('')}</div>`,
    num: (v = '00') => `<b class="num">${v}</b>`,
    /** Round avatar; name (optional) shows its first letter. */
    avatar: (s = 40, name = '') => `<span class="avatar" style="--s:${s}px">${name ? name[0] : ''}</span>`,
    /** Overlapping avatars: a count (blank) or a list of names (initials). */
    avatars: (n = 3) => `<span class="avatars">${(Array.isArray(n) ? n : Array(n).fill('')).map(x => `<span class="avatar">${x ? x[0] : ''}</span>`).join('')}</span>`,
    icon: (s = 20, round = false) => `<span class="icon${round ? ' round' : ''}" style="--s:${s}px"></span>`,
    media: (label = 'Image', h = 200) => `<div class="media" style="height:${h}px">${label}</div>`,
    progress: (p = 50) => `<div class="progress" style="--p:${p}%"><i></i></div>`,
    label: t => `<p class="label">${t}</p>`,
    /** Card section header: title + optional one-line question/meta. Spacing to the card body is built in. */
    head: (title, sub = '') => `<div class="sec-head"><b class="h2">${title}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`,
    /** Text link button ("See all →"); o: same nav options as btn. */
    link: (label, o = {}) => `<button class="link"${attrs(o)}>${label}</button>`,
    pill: (t, solid = false) => `<span class="pill${solid ? ' solid' : ''}">${t}</span>`,

    /** Button. kind: 'primary' | 'outline' | 'ghost'; o: {go, task, replace, sheet, back, close, toast, block, sm}. task = D.tasks number the target detail should show. */
    btn: (label, kind = 'outline', o = {}) =>
      `<button class="btn ${kind === 'outline' ? '' : kind}${o.block ? ' block' : ''}${o.sm ? ' sm' : ''}"${attrs(o)}>${label}</button>`,

    /** Chip row; clicking switches the active chip (handled by the router). */
    chips: (labels, on = 0) =>
      `<div class="chips" data-single>${labels.map((l, i) => `<button class="chip${i === on ? ' on' : ''}">${l}</button>`).join('')}</div>`,
    /** Segmented control; gos[i] optionally navigates to another screen. */
    seg: (labels, on = 0, gos = []) =>
      `<div class="seg" data-single>${labels.map((l, i) => `<button class="${i === on ? 'on' : ''}"${gos[i] ? ` data-go="${gos[i]}"` : ''}>${l}</button>`).join('')}</div>`,
    /** Underline tabs; gos[i] optionally navigates to another screen. */
    tabs: (labels, on = 0, gos = []) =>
      `<div class="tabs" data-single>${labels.map((l, i) => `<button class="${i === on ? 'on' : ''}"${gos[i] ? ` data-go="${gos[i]}"` : ''}>${l}</button>`).join('')}</div>`,

    /** Top app bar. o: {title, sub, back, right}. back = true pops history. */
    appbar: (o = {}) => `<header class="appbar">
      ${o.back ? '<button class="back" data-back aria-label="Back">←</button>' : ''}
      <h1>${o.title || ''}${o.sub ? `<span class="sub">${o.sub}</span>` : ''}</h1>
      ${o.right ? `<div class="right">${o.right}</div>` : ''}</header>`,
    /** Standard right side of the main tabs: profile avatar. */
    barRight: () => UI.avatar(34, window.D ? D.me().name : ''),

    /** Bottom navigation; active = 'home' | 'tasks' | 'projects' | 'events' | 'more'. */
    tabbar: active => `<nav class="tabbar">${[
      ['home', 'Home', 'home.main'], ['tasks', 'Tasks', 'tasks.my'], ['projects', 'Projects', 'projects.list'],
      ['events', 'Events', 'events.list'], ['more', 'More', 'home.more'],
    ].map(([k, l, go]) => `<button data-go="${go}" data-replace${k === active ? ' aria-current="page"' : ''}><i></i>${l}</button>`).join('')}</nav>`,

    card: (inner, o = {}) => {
      const tag = o.go || o.sheet || o.toast ? 'button' : 'div';
      return `<${tag} class="card ${o.cls || ''}"${attrs(o)}>${inner}</${tag}>`;
    },
    /** List row: o: {lead, title, sub, right, go, sheet, chev}. title/sub default to gray bars. */
    item: (o = {}) => {
      const tag = o.go || o.sheet || o.toast ? 'button' : 'div';
      return `<${tag} class="item"${attrs(o)}>${o.lead || ''}
        <span class="body">${o.title || UI.ph('70%', 'lg')}${o.sub === false ? '' : (o.sub || UI.ph('45%', 'sm'))}</span>
        ${o.right || ''}${o.chev ? '<span class="chev"></span>' : ''}</${tag}>`;
    },
    /** Form field. o: {ph: placeholder text, text: filled-in value, value: true/width for a gray bar, disabled, area, icon}. */
    field: (label, o = {}) => `<label class="field"><span>${label}</span>
      <span class="input${o.disabled ? ' disabled' : ''}${o.area ? ' area' : ''}">
        ${o.text ? `<span class="val">${o.text}</span>` : o.value ? UI.ph(o.value === true ? '55%' : o.value) : `<input placeholder="${o.ph || ''}"${o.disabled ? ' disabled' : ''}>`}${o.icon || ''}
      </span></label>`,

    /** Bottom sheet body (register with App.sheet). o: {title, sub, body, actions}. */
    sheet: (o = {}) => `<div class="grab"></div>
      ${o.title ? `<h2 class="h2">${o.title}</h2>` : ''}${o.sub ? `<p class="sub">${o.sub}</p>` : ''}
      <div class="stack">${o.body || ''}${o.actions || ''}</div>`,
  };
  window.UI = UI;
})();
