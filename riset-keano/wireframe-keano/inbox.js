// Inbox: kejadian dari orang lain yang menyangkut user, cara kerjanya seperti email.
// Tidak masuk Inbox: saran/notifikasi AI dan perubahan yang dibuat user sendiri.
// Satu pengecualian: pengingat tenggat dari sistem masuk Needs action karena user perlu bertindak.
(() => {
  const { esc, line } = window.WF_CARDS;
  const $ = id => document.getElementById(id);

  // empty: [judul, keterangan] saat tab kosong; Needs action memakai tampilan undang rekan
  const TABS = {
    action:  { label: 'Needs action' },
    updates: { label: 'Updates', empty: ['No updates yet', 'Changes to tasks you follow will show up here.'] },
    later:   { label: 'Later', empty: ['Nothing snoozed', 'Items you move to Later come back at the time you pick.'] },
    done:    { label: 'Done', empty: ['Nothing cleared yet', 'Items you clear move here. You can restore them anytime.'] },
  };

  // Jenis kejadian. group = pilihan di Filter; answers = tombol jawab langsung [tombol, hasil];
  // system = dari sistem, bukan orang; noTask = kejadiannya di level project, bukan task
  const KINDS = {
    assigned:   { tab: 'action', group: 'Assigned to you', text: 'assigned you a task' },
    comment:    { tab: 'action', group: 'Assigned to you', text: 'assigned you a comment', quote: true },
    mention:    { tab: 'action', group: 'Mentions & replies', text: 'mentioned you', quote: true },
    reply:      { tab: 'action', group: 'Mentions & replies', text: 'replied to your comment', quote: true },
    invite:     { tab: 'action', group: 'Invites', text: 'invited you to a project', noTask: true, answers: [['Accept', 'Accepted'], ['Decline', 'Declined']] },
    approval:   { tab: 'action', group: 'Approvals', text: 'asked for your approval', answers: [['Approve', 'Approved'], ['Reject', 'Rejected']] },
    dueSoon:    { tab: 'action', group: 'Due reminders', text: 'Task is due tomorrow', system: true },
    overdue:    { tab: 'action', group: 'Due reminders', text: 'Task is overdue', system: true },
    status:     { tab: 'updates', group: 'Task updates', text: 'changed the status of a task you follow' },
    dueDate:    { tab: 'updates', group: 'Task updates', text: 'changed the due date of a task you follow' },
    newComment: { tab: 'updates', group: 'Task updates', text: 'commented on a task you follow', quote: true },
    completed:  { tab: 'updates', group: 'Task updates', text: 'completed a task you follow' },
    accepted:   { tab: 'updates', group: 'People', text: 'accepted your invite', noTask: true },
    joined:     { tab: 'updates', group: 'People', text: 'joined a project', noTask: true },
  };
  const GROUPS = [...new Set(Object.values(KINDS).map(k => k.group))];

  // Satu contoh per jenis kejadian, plus contoh isi tab Later dan Done
  const items = [
    ...Object.keys(KINDS).map(kind => ({ kind, tab: KINDS[kind].tab, read: false })),
    { kind: 'mention', tab: 'later', read: true },
    { kind: 'status', tab: 'later', read: true },
    { kind: 'assigned', tab: 'done', read: true },
    { kind: 'invite', tab: 'done', read: true, result: 'Accepted' },
  ].map((it, i) => ({ ...it, id: 'n' + i }));

  const state = { tab: 'action', hiddenGroups: new Set() };
  const visible = tab => items.filter(it => it.tab === tab && !state.hiddenGroups.has(KINDS[it.kind].group));
  const unread = tab => items.some(it => it.tab === tab && !it.read);

  function renderItem(it) {
    const k = KINDS[it.kind];
    const head = k.system ? `<b>${k.text}</b>` : `<b>Name</b> ${k.text}`;
    const sub = k.noTask ? '<span>Project Name</span>' : `${line(40)}<span class="muted">· Project Name</span>`;
    const answers = k.answers && it.tab === 'action'
      ? `<div class="ib-answers">${k.answers.map(([btn, result]) => `<button class="btn-sm" data-act="answer" data-result="${result}">${btn}</button>`).join('')}</div>` : '';
    const tools = it.tab === 'done'
      ? `<span class="ib-tag">${esc(it.result || 'Cleared')}</span><span class="ib-tools"><button class="btn-sm" data-act="restore">↺ Restore</button></span>`
      : `${it.tab === 'later' ? '<span class="ib-tag">Back at Time</span>' : ''}<span class="ib-tools">
          <button class="btn-sm" data-act="open">Open</button>
          ${it.tab === 'later' ? '' : '<button class="btn-sm" data-act="later" title="Remind me later">◷ Later</button>'}
          <button class="btn-sm" data-act="clear" title="Clear">✓ Clear</button></span>`;
    return `<li class="ib-item ${it.read ? '' : 'unread'}" data-id="${it.id}">
      <span class="ib-dot" ${it.read ? '' : 'title="Unread"'}></span>
      <span class="${k.system ? 'ph-icon' : 'ph-avatar'} ib-who"></span>
      <div class="ib-main"><div class="ib-head">${head}</div><div class="ib-sub">${sub}</div>
        ${k.quote ? `<div class="ib-quote">${line(70)}</div>` : ''}${answers}</div>
      <div class="ib-side"><span class="muted">Time</span>${tools}</div></li>`;
  }

  function renderEmpty() {
    if (state.tab === 'action') return `<li class="ib-empty"><span class="ph-icon ib-empty-icon"></span>
      <strong>Looking to collaborate?</strong><span class="muted">Collaboration is one invite away.</span>
      <button class="btn-outline">Invite people</button></li>`;
    const [title, text] = TABS[state.tab].empty;
    return `<li class="ib-empty"><span class="ph-icon ib-empty-icon"></span><strong>${title}</strong><span class="muted">${text}</span></li>`;
  }

  function render() {
    $('ibTabs').innerHTML = Object.entries(TABS).map(([key, t]) => `<a href="#inbox/${key}" ${key === state.tab ? 'aria-current="page"' : ''}>
      <span class="ph-icon"></span>${t.label}${unread(key) ? '<span class="ib-badge">00</span>' : ''}</a>`).join('');
    const list = visible(state.tab);
    $('ibList').innerHTML = list.length ? list.map(renderItem).join('') : renderEmpty();
    // Clear all hanya untuk tab yang berisi item baru
    $('ibClearAll').hidden = !['action', 'updates'].includes(state.tab);
    $('ibClearAll').disabled = !list.length;
    $('ibFilterBtn').setAttribute('aria-pressed', String(state.hiddenGroups.size > 0));
    document.querySelector('#nav a[href="#inbox"]').classList.toggle('has-unread', unread('action'));
  }

  // ---------- Aksi per item ----------
  $('ibList').addEventListener('click', e => {
    const row = e.target.closest('.ib-item');
    if (!row) return;
    const it = items.find(i => i.id === row.dataset.id);
    const btn = e.target.closest('[data-act]');
    const act = btn ? btn.dataset.act : (it.tab === 'done' ? null : 'open');
    if (act === 'open') { it.read = true; window.WF_TASK.open(); }
    if (act === 'later') Object.assign(it, { tab: 'later', read: true });
    if (act === 'clear') Object.assign(it, { tab: 'done', read: true });
    if (act === 'answer') Object.assign(it, { tab: 'done', read: true, result: btn.dataset.result });
    if (act === 'restore') Object.assign(it, { tab: KINDS[it.kind].tab, result: null });
    render();
  });
  $('ibClearAll').addEventListener('click', () => {
    visible(state.tab).forEach(it => Object.assign(it, { tab: 'done', read: true }));
    render();
  });

  // ---------- Filter jenis kejadian ----------
  const filter = $('ibFilter');
  const setFilter = open => { filter.hidden = !open; $('ibFilterBtn').setAttribute('aria-expanded', String(open)); };
  filter.innerHTML = GROUPS.map(g => `<label><input type="checkbox" value="${g}" checked>${g}</label>`).join('') +
    '<p class="muted">AI suggestions and changes you make yourself never appear in Inbox.</p>';
  $('ibFilterBtn').addEventListener('click', () => setFilter(filter.hidden));
  filter.addEventListener('change', e => {
    if (e.target.checked) state.hiddenGroups.delete(e.target.value); else state.hiddenGroups.add(e.target.value);
    render();
  });
  document.addEventListener('click', e => { if (!filter.hidden && !e.target.closest('.ib-filter-wrap')) setFilter(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setFilter(false); });

  // Dipanggil routing di index.html: #inbox/<tab>
  function sync(path) {
    state.tab = TABS[path[0]] ? path[0] : 'action';
    render();
  }

  window.WF_INBOX = { sync };
})();
