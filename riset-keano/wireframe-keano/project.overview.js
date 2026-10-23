// Tab Overview: ringkasan satu project dalam kartu (angka, ringkasan AI, Team, daftar list, beban per status, aktivitas, file).
// Team tidak punya tab sendiri; anggota project dikelola dari kartu Team di sini.
(() => {
  const pv = window.WF_PV;
  const { ui } = pv;
  const { line, avatar } = ui;
  const { TYPES } = window.WF_CARDS;
  const ROLES = ['Owner', 'Member', 'Member', 'Member', 'Guest'];

  const card = (title, w, h, inner, type = '', tools = '') => `<article class="card" data-type="${type}" style="--w:${w};--h:${h}">
    <header class="card-head"><h2 class="card-title">${title}</h2>${tools}</header><div class="card-body">${inner}</div></article>`;

  const team = () => `<ul class="ov-team">${ROLES.map(r => `<li data-drill="Open tasks: Name">${avatar}
      <span class="ov-person"><b>Name</b><span class="muted small">00 open tasks</span></span><span class="ov-role">${r}</span></li>`).join('')}</ul>
    <div class="muted small ov-sub">Pending invites — 00</div>
    <ul class="ov-team"><li>${avatar}<span class="ov-person">${line(70, 'muted')}<span class="muted small">Invited · Date</span></span>
      <button class="btn-sm">Resend</button></li></ul>`;

  const lists = () => `<div class="ov-table"><div class="ov-row ov-head"><span>Name</span><span>Progress</span><span>Start</span><span>End</span><span>Priority</span><span>Owner</span></div>
    ${[60, 25].map((p, i) => `<button class="ov-row" data-list="${i}"><span class="ov-name"><span class="ph-icon"></span>List Name</span>
      <span class="ov-progress"><span class="ov-track"><span style="width:${p}%"></span></span><span class="small">00/00</span></span>
      <span>${line(70)}</span><span>${line(70)}</span>${ui.prio({ prio: i + 1 })}<span>${avatar}</span></button>`).join('')}
    <button class="dt-add" data-new-list>+ New List</button></div>`;

  const resources = () => `<div class="ov-drop">Drop files here or <u>browse</u></div>
    <ul class="ov-files">${[60, 45, 70].map(w => `<li><span class="ph-icon"></span><span class="ov-person">${line(w)}<span class="muted small">00 KB · Name · Date</span></span></li>`).join('')}</ul>`;

  pv.register('overview', (body, ctx) => {
    const count = (metric, title) => card(title, 3, 1, TYPES.count.render({ metric }), 'count');
    body.innerHTML = `<div class="pv-overview">
      ${ui.toolbar([ui.chip('◷ Updated Time')], [ui.chip('⚙ Customize'), '<button class="pill solid" data-add>+ Add Task</button>'])}
      <div class="dash-grid">
        ${count('active', 'In Progress')}${count('done', 'Completed')}${count('overdue', 'Overdue')}${count('dueWeek', 'Due in 7 Days')}
        ${card('AI Project Summary', 8, 2, TYPES['ai-summary'].render(), 'ai-summary')}
        ${card('Team <span class="muted">· 00</span>', 4, 5, team(), 'team', '<button class="btn-sm" data-invite>+ Invite</button>')}
        ${card('Lists', 8, 2, lists(), 'lists')}
        ${card('Workload by Status', 8, 1, TYPES['status-bar'].render(), 'status-bar')}
        ${card('Recent Activity', 6, 2, TYPES.activity.render(), 'activity', '<button class="btn-sm" data-drill="Activity">View all</button>')}
        ${card('Resources', 6, 2, resources(), 'resources', '<button class="btn-sm">+ Upload</button>')}
      </div></div>`;

    body.firstElementChild.addEventListener('click', e => {
      const list = e.target.closest('[data-list]');
      if (list) { location.hash = [...ctx.base, list.dataset.list].join('/'); return; }
      if (e.target.closest('[data-add]')) return window.WF_DRAWER.open('New task');
      if (e.target.closest('[data-invite]')) return window.WF_DRAWER.open('Invite people');
      const drill = e.target.closest('[data-drill]');
      if (drill) window.WF_DRAWER.open(drill.dataset.drill);
    });
  });
})();
