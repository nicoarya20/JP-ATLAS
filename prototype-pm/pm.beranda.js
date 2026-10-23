// ④ Beranda Project Manager: Daily Briefing, ringkasan tugas, My Focus, Ask Data, agenda, aktivitas terbaru.
JUMPS.push(['Beranda', 'Beranda Project Manager', 'beranda']);

const ASK = [
  ['Proyek mana yang tertinggal?', () => 'Hajatan Keluarga paling tertinggal: baru 4 dari 10 tugas selesai, padahal acara tinggal 16 hari.'],
  ['Tugas apa yang paling lama tertunda?', () => { const t = S.tasks.filter(isLate).sort((a, b) => a.tenggat.localeCompare(b.tenggat))[0]; return t ? `“${t.judul}” di ${proj(t.proyek).nama}, tenggatnya ${fmt(t.tenggat)}.` : 'Tidak ada tugas yang terlambat.'; }],
  ['Siapa paling banyak tugas?', () => { const c = {}; S.tasks.filter(t => t.pj && !['done', 'cancel'].includes(t.status)).forEach(t => { c[t.pj] = (c[t.pj] || 0) + 1; }); const [id, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return `${who(id)} memegang ${n} tugas aktif, paling banyak di tim.`; }],
];
const focusOf = () => {
  const mine = S.tasks.filter(t => t.pj === ME && ['todo', 'doing'].includes(t.status));
  const week = addDays(TODAY, 7);
  return {
    late: mine.filter(t => t.tenggat < TODAY),
    today: mine.filter(t => t.tenggat === TODAY),
    week: mine.filter(t => t.tenggat > TODAY && t.tenggat <= week).sort((a, b) => a.tenggat.localeCompare(b.tenggat)),
  };
};
const focusRow = (t, tone) => `<div class="item"><span class="t"><b>${esc(t.judul)}</b><span class="small mute">${esc(proj(t.proyek).nama)}${tone === 'late' ? ` · ⚠ Terlambat ${Math.round((new Date(TODAY) - new Date(t.tenggat)) / 864e5)} hari` : t.tenggat > TODAY ? ` · ${hari(t.tenggat)}` : ''}</span></span>${btn('Selesai', { cls: 'sm', act: 'selesai', arg: t.id, busy: 400 })}</div>`;
const actCount = (ids) => S.tasks.filter(t => ids.includes(t.status) && proj(t.proyek)?.lead === ME).length;

SCREENS.beranda = () => {
  const f = focusOf(), r = S.tasks.filter(t => t.status === 'review' && t.pemeriksa === ME);
  const unassigned = S.tasks.filter(t => !t.pj && !['done', 'cancel'].includes(t.status) && proj(t.proyek)?.lead === ME).length;
  const tile = (n, l, cap, fl) => `<button type="button" class="card stat" data-act="tile" data-arg="${fl}"><span class="small b">${l}</span><b>${n}</b><span class="small mute">tugas · ${cap}</span></button>`;
  const agenda = S.events.filter(e => e.tgl === TODAY || (e.tgl > TODAY && e.tgl <= addDays(TODAY, 4))).sort((a, b) => (a.tgl + a.jam).localeCompare(b.tgl + b.jam));
  const sh = (id) => ({ hajatan: '⚠ Perlu perhatian', renovasi: '✓ Aman', arisan: '✓ Aman' }[id]);
  const ask = S.ask;
  return `${head('Beranda', '', `<p class="mute">${hari(TODAY)}, ${fmtL(TODAY)} · Selamat pagi, Nico</p>`)}
  <section class="card ink" aria-label="Daily Briefing"><div class="sec" style="margin-top:0">${ico('spark')} Daily Briefing</div><h2>Apa yang perlu saya tahu hari ini?</h2>
    <p>Ada ${f.late.length} hal yang terlambat: ${f.late.length ? `${esc(f.late[0].judul.toLowerCase())} sudah lewat ${Math.round((new Date(TODAY) - new Date(f.late[0].tenggat)) / 864e5)} hari` : 'tidak ada, semua aman'}.</p>
    <p>Hari ini ada ${f.today.length} tugas dan ${S.events.filter(e => e.tgl === TODAY).length} rapat. Proyek Hajatan Keluarga perlu perhatian karena katering belum dipesan.</p>
    <p class="small mute">${ico('spark')} Disusun otomatis dari data proyek · diperbarui 07.30</p></section>
  <div class="grid s3" style="margin:.9rem 0">${tile(unassigned, 'Unassigned', 'tanpa penanggung jawab', 'unassigned')}${tile(actCount(['todo', 'doing', 'review']), 'In Progress', 'tugas aktif di proyek yang saya kelola', 'aktif')}${tile(actCount(['done']), 'Completed', 'tugas selesai di proyek yang saya kelola', 'done')}</div>
  <div class="two">
    <section class="card"><h2>My Focus</h2>
      ${f.late.length ? `<div class="sec late">⚠ Terlambat</div>${f.late.map(t => focusRow(t, 'late')).join('')}` : ''}
      ${f.today.length ? `<div class="sec">${ico('clock')} Hari ini</div>${f.today.map(t => focusRow(t, 'today')).join('')}` : ''}
      ${f.week.length ? `<div class="sec">Minggu ini</div>${f.week.map(t => focusRow(t, 'week')).join('')}` : ''}
      ${!f.late.length && !f.today.length && !f.week.length ? empty('check', 'Semua beres', 'Tidak ada tugas yang menunggu Anda minggu ini.') : ''}
      ${r.map(t => `<div class="item"><span class="t"><b>Periksa: ${esc(t.judul)}</b><span class="small mute">Menunggu diperiksa saya · ${esc(proj(t.proyek).nama)} · ${who(t.pj).split(' ')[0]}</span></span>${btn('Periksa', { cls: 'sm', go: `tugas/${t.id}` })}</div>`).join('')}
      <p class="right">${btn(`Lihat semua tugas (${S.tasks.filter(t => t.pj === ME && !['done', 'cancel'].includes(t.status)).length})`, { cls: 'sm', act: 'tile', arg: 'saya' })}</p></section>
    <section class="card"><h2>${ico('spark')} Ask Data</h2><p class="mute small">Tanya apa saja tentang proyek</p>
      <form class="row" data-submit="ask"><input id="ask-q" type="text" placeholder="Ketik atau ucapkan pertanyaan…" aria-label="Pertanyaan">${btn('Tanya', { cls: 'dark', act: 'ask', busy: 500 })}</form>
      <div class="wrap" style="margin:.6rem 0">${ASK.map(([q], i) => chip(esc(q), { act: 'askchip', arg: i })).join('')}</div>
      ${ask ? `<div class="item"><span class="t"><b>${esc(ask.q)}</b><span>${esc(ask.a)}</span></span></div>` : ''}</section>
  </div>
  <div class="two" style="margin-top:.9rem">
    <section class="card"><h2>Agenda</h2>${agenda.map(e => `<div class="item"><span class="t"><b>${e.jam} · ${esc(e.judul)}</b><span class="small mute">${e.tgl === TODAY ? 'hari ini' : `${hari(e.tgl)}, ${fmt(e.tgl)}`}${e.siap === false ? ' · ⚠ Belum siap: katering belum dipesan' : ''}</span></span>${btn('Lihat', { cls: 'sm', go: `events/${e.id}` })}</div>`).join('') || empty('cal', 'Belum ada agenda', 'Tidak ada rapat dalam waktu dekat.')}</section>
    <section class="card"><h2>Projects</h2>${['hajatan', 'renovasi', 'arisan'].map(id => { const p = proj(id); const ts = S.tasks.filter(t => t.proyek === id); return `<button type="button" class="item" style="width:100%;text-align:left;cursor:pointer" data-go="proyek/${id}"><span class="t"><b>${esc(p.nama)}</b><span class="small mute">${ts.filter(t => t.status === 'done').length} dari ${Math.max(ts.length, 10)} tugas selesai</span></span><span class="badge ${id === 'hajatan' ? 'warn' : ''}">${sh(id)}</span></button>`; }).join('')}<p class="right">${btn('Lihat semua', { cls: 'sm', go: 'proyek' })}</p></section>
  </div>
  <section class="card" style="margin-top:.9rem"><h2>Latest Activity</h2>${S.inbox.kabar.slice(0, 3).map(k => `<div class="item"><span class="t">${esc(k.teks)}<span class="small mute">${k.waktu}</span></span>${btn('Lihat', { cls: 'sm', go: k.to })}</div>`).join('')}</section>`;
};

ACT.selesai = id => { const t = task(id); t.status = 'done'; toast(`“${t.judul}” ditandai selesai.`, () => { t.status = 'todo'; }); };
ACT.tile = a => { S.tu.scope = a === 'saya' ? 'saya' : 'semua'; S.tu.filter = { unassigned: 'unassigned', done: 'done', aktif: 'aktif', saya: 'aktif' }[a]; S.tu.proyek = ''; go('tugas'); };
ACT.askchip = i => { const [q, f] = ASK[i]; S.ask = { q, a: f() }; };
ACT.ask = () => { const q = val('ask-q'); const hit = ASK.find(([x]) => x.toLowerCase() === q.toLowerCase()); S.ask = hit ? { q: hit[0], a: hit[1]() } : { q: q || 'Pertanyaan kosong', a: 'Prototype hanya menjawab tiga pertanyaan contoh. Pilih salah satu chip di bawah kolom.' }; };
