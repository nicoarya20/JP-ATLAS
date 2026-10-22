// Events: ① Daftar (+Filter), ② Kalender bulan, ④ Detail (akan datang / hasil dikonfirmasi), ⑧ Batalkan dan Hapus (termasuk event berulang).
JUMPS.push(['Events', '① Events · Daftar (default)', 'events', () => { S.eu.tab = 'akan'; S.eu.view = 'daftar'; S.eu.jenis = 'Semua'; }], ['Events', '①b Events · Filter ▾ terbuka', 'events', () => { S.eu.view = 'daftar'; S.ui.pop = 'efilter'; }],
  ['Events', '② Events · Kalender (Bulan)', 'events', () => { S.eu.view = 'kalender'; }], ['Events', '④ Detail · Akan datang', 'events/e2'], ['Events', '⑦ Detail · Hasil dikonfirmasi', 'events/e3'],
  ['Events', '⑧ Modal Batalkan event', 'events/e2', () => ACT.ebatal('e2')], ['Events', '⑧ Modal Hapus', 'events/e2', () => ACT.ehapus('e2')], ['Events', '⑧b Hapus dan Batalkan · event berulang', 'events/e5', () => ACT.ehapus('e5')]);
const HARI_S = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const perluHasil = e => e.status === 'lewat' && e.hasil && !e.hasil.ok;
const urut = (a, b) => (a.tgl + a.jam).localeCompare(b.tgl + b.jam);

function eventRow(e) {
  const today = e.tgl === TODAY;
  return `<div class="item"><span class="b" style="min-width:4.5rem">${hari(e.tgl).slice(0, 3)}, ${fmt(e.tgl)}<br><span class="small mute b">${e.jam}</span></span><span class="t"><button type="button" class="back" style="margin:0;text-decoration:none;font-weight:700;color:inherit;text-align:left" data-go="events/${e.id}">${esc(e.judul)}</button><span class="small mute">${e.jenis} · ${e.mode}${e.lokasi ? ` · ${esc(e.lokasi)}` : ''}${e.berulang ? ' · Berulang' : ''}</span></span>${today ? badge('Hari ini', 'solid') : ''}${perluHasil(e) ? badge('Hasil perlu diperiksa', 'warn') : ''}${e.status === 'batal' ? badge('Dibatalkan', 'dash') : ''}${perluHasil(e) ? btn('Periksa hasil', { cls: 'sm dark', go: `events/${e.id}/langkah/3` }) : btn('Lihat', { cls: 'sm', go: `events/${e.id}` })}</div>`;
}

function eventsList() {
  const u = S.eu, ok = e => u.jenis === 'Semua' || e.jenis === u.jenis;
  const akan = S.events.filter(e => ok(e) && (e.status === 'akan' || perluHasil(e))).sort(urut), lewat = S.events.filter(e => ok(e) && e.status !== 'akan' && !perluHasil(e)).sort((a, b) => urut(b, a));
  const pop = S.ui.pop === 'efilter' ? `<div class="pop" data-keep style="min-width:280px"><div class="sec" style="margin:.25rem .5rem">Jenis</div><div class="wrap" style="padding:.25rem .5rem">${['Semua', ...JENIS_E].map(j => chip(j, { on: u.jenis === j, act: 'ejenis', arg: j })).join('')}</div><div class="row" style="padding:.5rem;justify-content:flex-end">${btn('Atur ulang', { cls: 'sm', act: 'ejenis', arg: 'Semua' })}${btn('Terapkan', { cls: 'sm dark', act: 'pop', arg: 'efilter' })}</div></div>` : '';
  const bar_ = `<div class="wrap" style="margin-bottom:1rem">${u.view === 'daftar' ? tabs([['akan', 'Akan datang'], ['lewat', 'Sudah lewat']], u.tab, k => ({ act: 'etab', arg: k })).replace('class="tabs"', 'class="tabs" style="margin:0;border:0"') : ''}<span class="grow"></span>
    <span class="pop-w">${btn(`Filter${u.jenis !== 'Semua' ? `: ${u.jenis}` : ''} ${ico('down')}`, { cls: 'sm', act: 'pop', arg: 'efilter' })}${pop}</span>${seg([['daftar', 'Daftar'], ['kalender', 'Kalender']], u.view, k => ({ act: 'eview', arg: k }))}</div>`;
  const list = u.tab === 'akan' ? akan : lewat;
  const body = u.view === 'kalender' ? kalender() : list.length ? list.map(eventRow).join('') : empty('cal', u.tab === 'akan' ? 'Belum ada event mendatang' : 'Belum ada event yang lewat', u.jenis === 'Semua' ? 'Buat event baru untuk mengatur jadwal tim.' : `Tidak ada event berjenis ${u.jenis}.`, btn(`${ico('plus')} Event baru`, { cls: 'dark', go: 'events/baru' }));
  return `${head('Events', btn(`${ico('plus')} Event baru`, { cls: 'dark', go: 'events/baru' }))}${bar_}${body}`;
}

function kalender() {
  const { y, m } = S.eu.cal, first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), pad = n => String(n).padStart(2, '0');
  const cells = [...Array(first).fill('<div class="o"></div>'), ...Array.from({ length: days }, (_, i) => {
    const d = `${y}-${pad(m + 1)}-${pad(i + 1)}`, es = S.events.filter(e => e.tgl === d && e.status !== 'batal');
    return `<div class="${d === TODAY ? 'today' : ''}"><b>${i + 1}</b>${es.map(e => `<button type="button" data-go="events/${e.id}" title="${esc(e.judul)}">${e.jam} ${esc(e.judul)}</button>`).join('')}</div>`;
  })];
  return `<div class="wrap sp-b" style="margin-bottom:.6rem"><div class="wrap">${btn(ico('left'), { cls: 'sm', act: 'ebulan', arg: -1 })}<b style="min-width:9rem;text-align:center">${BLN_L[m]} ${y}</b>${btn(ico('right'), { cls: 'sm', act: 'ebulan', arg: 1 })}${btn('Hari ini', { cls: 'sm', act: 'ehariini' })}</div></div>
  <div class="cal">${HARI_S.map(h => `<div class="h">${h}</div>`).join('')}${cells.join('')}</div>`;
}

function eventDetail(id) {
  const e = ev(id);
  if (!e) return empty('cal', 'Event tidak ditemukan', 'Event ini mungkin sudah dipindah ke Sampah.', btn('Ke daftar event', { go: 'events' }));
  const menu = S.ui.pop === 'event' ? `<div class="pop" data-keep><button type="button" data-act="ebatal" data-arg="${id}"${e.status === 'akan' ? '' : ' disabled'}>${ico('x')} Batalkan event</button><button type="button" data-act="ehapus" data-arg="${id}">${ico('trash')} Hapus (pindah ke Sampah)</button></div>` : '';
  const catatan = e.hasil?.ok ? `<section class="card" style="margin-top:.9rem"><h2>Hasil rapat ${badge('Dikonfirmasi', 'solid')}</h2><p>${esc(S.ui.notulen === id ? e.hasil.teks : `${e.hasil.teks.slice(0, 90)}…`)}</p>${btn(S.ui.notulen === id ? 'Sembunyikan notulensi' : 'Lihat notulensi lengkap', { cls: 'sm', act: 'notulen', arg: id })}<div class="sec">Tugas dari rapat</div>${e.hasil.tugas.map(x => `<div class="item"><span class="t">${esc(x)}</span>${badge('Dibuat')}</div>`).join('')}</section>`
    : perluHasil(e) ? `<section class="card" style="margin-top:.9rem"><h2>Hasil menunggu konfirmasi</h2><p class="mute">Teks dan tugas dari rapat sudah disusun. Periksa dulu sebelum tugas dibuat.</p>${btn('Periksa hasil', { cls: 'dark', go: `events/${id}/langkah/3` })}</section>`
    : e.status === 'akan' ? `<section class="card" style="margin-top:.9rem"><h2>Catatan rapat</h2><p class="mute">Catat hasil rapat dengan cara yang paling mudah.</p><div class="wrap">${btn(`${ico('pen')} Ketik`, { act: 'ecatat', arg: `${id}:ketik` })}${btn(`${ico('camera')} Foto ✦`, { act: 'ecatat', arg: `${id}:foto`, busy: 700 })}${btn(`${ico('mic')} Suara ✦`, { go: `events/${id}/rekam` })}</div></section>` : '';
  return `${back('Semua event', 'events')}${head(esc(e.judul), `${btn('Ubah', { go: `events/ubah/${id}`, off: e.status !== 'akan', title: e.status === 'akan' ? '' : 'Event yang sudah lewat tidak bisa diubah' })}<span class="pop-w">${btn(ico('dots'), { cls: 'sm', act: 'pop', arg: 'event' })}${menu}</span>`,
    `<p class="wrap">${badge(e.status === 'akan' ? 'Akan datang' : e.status === 'batal' ? 'Dibatalkan' : 'Sudah lewat', e.status === 'akan' ? '' : 'dash')}${badge(e.jenis)}${badge(e.mode)}${e.berulang ? badge('Berulang mingguan', 'dash') : ''}</p>`)}
  <section class="card"><div class="two"><div><p class="lbl">Waktu</p><p>${hari(e.tgl)}, ${fmtL(e.tgl)} · ${e.jam}${e.tgl === TODAY ? ` ${badge('Hari ini', 'solid')}` : ''}</p><p class="lbl">${e.mode === 'Online' ? 'Tautan' : 'Tempat'}</p><p>${esc(e.lokasi) || '—'}</p></div>
  <div><p class="lbl">Peserta</p><p class="wrap">${e.peserta.map(p => `${avatar(p)} ${esc(who(p))}`).join(' · ')}</p><p class="lbl">Deskripsi</p><p>${esc(e.desk) || '<span class="mute">Belum ada deskripsi.</span>'}</p></div></div>${e.siap === false ? note('⚠ Belum siap: katering belum dipesan.') : ''}</section>${catatan}`;
}

SCREENS.events = p => !p[0] ? eventsList() : p[0] === 'baru' ? eventForm() : p[0] === 'ubah' ? eventForm(p[1]) : p[1] === 'rekam' ? eventRekam(p[0]) : p[1] === 'langkah' ? eventLangkah(p[0], p[2]) : eventDetail(p[0]);

ACT.etab = k => { S.eu.tab = k; };
ACT.eview = k => { S.eu.view = k; };
ACT.ejenis = k => { S.eu.jenis = k; S.ui.pop = 'efilter'; };
ACT.ebulan = n => { const c = S.eu.cal; const d = new Date(c.y, c.m + Number(n), 1); c.y = d.getFullYear(); c.m = d.getMonth(); };
ACT.ehariini = () => { S.eu.cal = { y: 2026, m: 9 }; };
ACT.notulen = id => { S.ui.notulen = S.ui.notulen === id ? null : id; };
ACT.ecatat = a => { const [id, cara] = a.split(':'); S.rekam = { ...S.rekam, evId: id, teks: cara === 'foto' ? 'Dari foto papan tulis: anggaran disetujui, katering dipesan minggu ini, tenda dikonfirmasi Pak Budi.' : '', tugas: null }; go(`events/${id}/langkah/2`); };
ACT.ebatal = id => {
  const e = ev(id);
  openModal('Batalkan event?', `<p>“${esc(e.judul)}” tetap ada di daftar dengan tanda Dibatalkan, dan ${e.peserta.length - 1} peserta akan diberi tahu.</p>${e.berulang ? scopeOpts() : ''}`, [['Kembali', { act: 'close' }], ['Batalkan event', { cls: 'dark', act: 'ebatalok', arg: id, busy: 500 }]]);
};
const scopeOpts = () => `<div class="col" style="margin-top:.5rem">${[['ini', 'Hanya event ini'], ['berikut', 'Event ini dan berikutnya'], ['semua', 'Semua event dalam rangkaian']].map(([k, l], i) => `<label class="chk"><input type="radio" name="escope" value="${k}"${i ? '' : ' checked'}> ${l}</label>`).join('')}</div>`;
ACT.ebatalok = id => { const e = ev(id); e.status = 'batal'; closeModal(); toast(`“${e.judul}” dibatalkan.`); };
ACT.ehapus = id => {
  const e = ev(id);
  openModal('Hapus event?', `<p>“${esc(e.judul)}” dipindah ke Sampah dan bisa dipulihkan selama 30 hari.</p>${e.berulang ? scopeOpts() : ''}`, [['Batal', { act: 'close' }], ['Pindah ke Sampah', { cls: 'dark', act: 'ehapusok', arg: id, busy: 500 }]]);
};
ACT.ehapusok = id => {
  const e = ev(id), item = { id: `x${nextId()}`, tipe: 'Event', nama: e.judul, info: 'Dihapus baru saja · sisa 30 hari', payload: e };
  S.events = S.events.filter(x => x.id !== id); S.trash.unshift(item); closeModal();
  toast(`“${e.judul}” dipindah ke Sampah.`, () => restoreTrash(item.id, true)); go('events');
};
