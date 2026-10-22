// Tab Channel: grup chat per project ala Discord (daftar channel, pesan, anggota). Isi pesan hanya garis placeholder.
(() => {
  const pv = window.WF_PV;
  const { ui } = pv;
  const { esc, line, avatar } = ui;
  const state = { channels: ['general', 'channel-name', 'channel-name'], active: 0, members: true, sent: {} };
  const lines = ws => ws.map(w => `<div>${line(w)}</div>`).join('');
  const tools = `<span class="ch-tools">
    <button class="btn-sm" title="Add reaction">☺</button><button class="btn-sm" title="Reply">↩</button>
    <button class="btn-sm" data-thread title="Start thread">⌗</button><button class="btn-sm" title="More">⋯</button></span>`;
  // Pesan pertama dalam grup: avatar + nama + waktu; lanjutan dari orang yang sama tanpa header
  const msg = (inner, extra = '') => `<div class="ch-msg">${avatar}<div class="ch-main">
    <div class="ch-who"><b>Name</b><span class="muted small">Time</span></div>${inner}${extra}</div>${tools}</div>`;
  const cont = inner => `<div class="ch-msg cont"><span class="muted small ch-time">Time</span><div class="ch-main">${inner}</div>${tools}</div>`;

  const sample = () => [
    '<div class="ch-divider"><span>Date</span></div>',
    '<div class="ch-system"><span class="ph-icon"></span><b>Name</b> joined the channel. <span class="muted small">Time</span></div>',
    msg(lines([70, 45])),
    cont(lines([55])),
    cont(`<div class="ch-file"><span class="ph-icon"></span><div>${line(60)}<div class="muted small">00 KB</div></div><button class="btn-sm">↓</button></div>`),
    msg(`<div><span class="ch-mention">@Name</span> ${line(50)}</div>`,
      '<div class="ch-reacts"><button class="ch-react on">☺ 00</button><button class="ch-react">✓ 00</button><button class="ch-react add">+</button></div>'),
    msg(`<div class="ch-quote">↩ <b>Name</b> ${line(40, 'muted')}</div>${lines([65])}`,
      '<button class="ch-thread" data-thread>⌗ 00 replies <span class="muted small">Last reply Time</span></button>'),
    msg(`${lines([35])}<div class="ch-embed" data-task="embed"><span class="st-dot st-1"></span>${line(55)}${ui.statusTag(1)}</div>`),
    ...(state.sent[state.active] || []).map(text => `<div class="ch-msg">${avatar}<div class="ch-main">
      <div class="ch-who"><b>You</b><span class="muted small">Just now</span></div><div>${esc(text)}</div></div>${tools}</div>`),
  ].join('');

  const member = on => `<li class="ch-member${on ? '' : ' off'}">${avatar}<span>Name</span></li>`;

  pv.register('channel', body => {
    const name = state.channels[state.active];
    body.innerHTML = `<div class="pv-channel${state.members ? '' : ' no-members'}">
      <aside class="ch-list">
        <div class="ch-list-head"><span class="muted small">CHANNELS</span><button class="btn-sm" data-new title="Create channel">+</button></div>
        <ul>${state.channels.map((c, i) => `<li><button data-ch="${i}" ${i === state.active ? 'aria-current="true"' : ''}>
          <span class="muted">#</span><span class="ellipsis">${esc(c)}</span>${i === 1 ? '<span class="ch-unread">00</span>' : ''}</button></li>`).join('')}</ul>
        <div class="ch-list-head"><span class="muted small">VOICE</span></div>
        <ul><li><button><span class="muted">🔈</span><span class="ellipsis">voice-name</span></button></li></ul>
      </aside>
      <section class="ch-room">
        <header class="ch-head"><b># ${esc(name)}</b><span class="ch-topic">${line(30, 'muted')}</span><span class="spacer"></span>
          <button class="btn-sm" title="Threads">⌗</button><button class="btn-sm" title="Notifications">🔔</button>
          <button class="btn-sm" data-pins title="Pinned messages">📌</button>
          <button class="btn-sm" data-members aria-pressed="${state.members}" title="Member list">👥</button>
          <label class="ch-search"><input type="search" placeholder="Search"></label></header>
        <div class="ch-messages">${sample()}</div>
        <form class="ch-composer"><button type="button" class="btn-sm" title="Upload file">+</button>
          <input name="text" autocomplete="off" placeholder="Message #${esc(name)}">
          <button type="button" class="btn-sm" title="Emoji">☺</button><button class="pill solid">Send</button></form>
      </section>
      <aside class="ch-members">
        <div class="muted small">ONLINE — 00</div><ul>${[1, 1, 1].map(member).join('')}</ul>
        <div class="muted small">OFFLINE — 00</div><ul>${[0, 0].map(member).join('')}</ul>
      </aside></div>`;

    const root = body.firstElementChild;
    const feed = root.querySelector('.ch-messages');
    feed.scrollTop = feed.scrollHeight;
    root.addEventListener('click', e => {
      const ch = e.target.closest('[data-ch]');
      if (ch) { state.active = Number(ch.dataset.ch); return pv.refresh(); }
      if (e.target.closest('[data-new]')) { state.channels.push('new-channel'); state.active = state.channels.length - 1; return pv.refresh(); }
      if (e.target.closest('[data-members]')) { state.members = !state.members; return pv.refresh(); }
      if (e.target.closest('[data-thread]')) return window.WF_DRAWER.open('Thread');
      if (e.target.closest('[data-pins]')) return window.WF_DRAWER.open('Pinned messages');
      const open = e.target.closest('[data-task]');
      if (open) return pv.openTask(open.dataset.task);
      const react = e.target.closest('.ch-react:not(.add)');
      if (react) react.classList.toggle('on');
    });
    // Enter / Send menambah pesan "You" di akhir channel (hanya contoh alur, tidak tersimpan)
    root.querySelector('.ch-composer').addEventListener('submit', e => {
      e.preventDefault();
      const text = e.target.elements.text.value.trim();
      if (!text) return;
      (state.sent[state.active] ??= []).push(text);
      pv.refresh();
      document.querySelector('.ch-composer input').focus();
    });
  });
})();
