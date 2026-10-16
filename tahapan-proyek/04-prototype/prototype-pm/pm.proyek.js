// Proyek: daftar (List/Grid), detail dengan tab Ringkasan/Tugas/Tahapan/Anggota, perpanjang tenggat, hapus proyek.
JUMPS.push(['Proyek', '① Semua proyek', 'proyek'], ['Proyek', '⑧ Detail · Ringkasan', 'proyek/atlas'], ['Proyek', '⑨ Detail · Tugas', 'proyek/atlas/tugas'], ['Proyek', '⑩ Detail · Tahapan', 'proyek/atlas/tahapan'],
  ['Proyek', '⑪ Detail · Anggota', 'proyek/atlas/anggota'], ['Proyek', '⑧ Detail · PM bukan pengelola', 'proyek/sinar']);
const PU_STATUS = ['Semua', 'Berjalan', 'Ditunda', 'Selesai', 'Draf', '! Perlu perhatian'];
const COLS = '--c:2.2fr 1fr 1.5fr 1.2fr 1.1fr 1fr';

SCREENS.proyek = p => !p[0] ? proyekList() : p[0] === 'baru' ? proyekBaru(p[1]) : p[1] === 'pengaturan' ? proyekSet(p[0]) : proyekDetail(p[0], p[1] || 'ringkasan');

function proyekList() {
  const u = S.pu, q = u.q.toLowerCase();
  const rows = S.projects.filter(p => (u.scope === 'semua' || p.anggota.includes(ME))
    && (u.status === 'Semua' || (u.status === '! Perlu perhatian' ? p.status === 'Berjalan' && p.kond !== 'ok' : p.status === u.status))
    && (!q || `${p.nama} ${p.desk}`.toLowerCase().includes(q)))
    .sort((a, b) => u.sort === 'nama' ? a.nama.localeCompare(b.nama) : u.sort === 'progres' ? b.progres - a.progres : a.tenggat.localeCompare(b.tenggat));
  const row = p => `<button type="button" class="trow" style="${COLS}" data-go="proyek/${p.id}"><span><b>${esc(p.nama)}</b><br><span class="small mute">Lead: ${esc(PEOPLE[p.lead].n)}</span></span>${badge(p.status, p.status === 'Draf' ? 'dash' : '')}<span>${kondBadge(p)}<br><span class="small mute">${esc(p.info)}</span></span><span>${bar(p.progres)}<span class="small">${p.progres}%</span></span><span>${fmt(p.tenggat)}${p.ext ? `<br><span class="small mute">Diperpanjang ×${p.ext}</span>` : ''}</span>${avs(p.anggota)}</button>`;
  const card = p => `<button type="button" class="card" style="text-align:left;cursor:pointer" data-go="proyek/${p.id}"><div class="row sp-b"><b>${esc(p.nama)}</b>${badge(p.status, p.status === 'Draf' ? 'dash' : '')}</div><p class="small mute">Lead: ${esc(PEOPLE[p.lead].n)} · ${esc(p.info)}</p>${bar(p.progres)}<div class="row sp-b" style="margin-top:.5rem"><span class="small">${p.progres}% · ${fmt(p.tenggat)}</span>${avs(p.anggota)}</div></button>`;
  const body = !rows.length ? empty('folder', 'Belum ada proyek yang cocok', 'Coba ubah kata kunci atau filter status.', btn('Atur ulang filter', { act: 'pureset' }))
    : u.view === 'grid' ? `<div class="grid">${rows.map(card).join('')}</div>`
    : `<div class="thead" style="${COLS}"><span>Nama proyek</span><span>Status</span><span>Kondisi</span><span>Progres</span><span>Tenggat</span><span>Anggota</span></div>${rows.map(row).join('')}`;
  return `${head('Proyek', btn(`${ico('plus')} Proyek baru`, { cls: 'dark', go: 'proyek/baru' }))}
  <div class="wrap" style="margin-bottom:.75rem"><div class="search" style="margin:0;max-width:340px">${ico('search')}<input id="pu-q" type="text" data-live="puq" value="${esc(u.q)}" placeholder="Cari nama atau deskripsi proyek…" aria-label="Cari proyek"></div>
    ${seg([['saya', 'Proyek saya'], ['semua', 'Semua proyek']], u.scope, k => ({ act: 'puscope', arg: k }))}${seg([['list', 'List'], ['grid', 'Grid']], u.view, k => ({ act: 'puview', arg: k }))}</div>
  <div class="wrap" style="margin-bottom:1rem">${PU_STATUS.map(s => chip(esc(s), { on: u.status === s, act: 'pustatus', arg: s })).join('')}<span class="grow"></span>
    <select data-change="pusort" aria-label="Urutkan" style="width:auto">${[['tenggat', 'Urutkan: Tenggat terdekat'], ['nama', 'Urutkan: Nama A–Z'], ['progres', 'Urutkan: Progres']].map(([k, l]) => `<option value="${k}"${u.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>${body}`;
}

function proyekDetail(id, tab) {
  const p = proj(id);
  if (!p) return empty('folder', 'Proyek tidak ditemukan', 'Proyek ini mungkin sudah dipindah ke Sampah.', btn('Ke daftar proyek', { go: 'proyek' }));
  const lead = isLead(p), why = 'Hanya pengelola proyek (Lead) yang bisa melakukan ini.';
  const menu = S.ui.pop === 'proj' ? `<div class="pop" data-keep><a href="#/proyek/${id}/pengaturan">${ico('gear')} Pengaturan proyek</a><button type="button" data-act="hapusproyek" data-arg="${id}"${lead ? '' : ` disabled title="${why}"`}>${ico('trash')} Hapus proyek</button></div>` : '';
  const acts = `${btn('Perpanjang tenggat', { act: 'perpanjang', arg: id, off: !lead || p.status === 'Selesai', title: lead ? '' : why })}<span class="pop-w">${btn(ico('dots'), { cls: 'sm', act: 'pop', arg: 'proj' })}${menu}</span>`;
  const sub = `<p class="wrap mute">${badge(p.status)} ${kondBadge(p)} <span>Lead: ${esc(who(p.lead))} · Tenggat ${fmt(p.tenggat)}</span>${p.ext ? badge(`Diperpanjang ×${p.ext}`, 'dash') : ''}</p>`;
  const t = tabs([['ringkasan', 'Ringkasan'], ['tugas', 'Tugas'], ['tahapan', 'Tahapan'], ['anggota', 'Anggota']], tab, k => ({ go: k === 'ringkasan' ? `proyek/${id}` : `proyek/${id}/${k}` }));
  const body = { ringkasan: tabRingkasan, tugas: tabTugas, tahapan: tabTahapan, anggota: tabAnggota }[tab] || tabRingkasan;
  return `${back('Semua proyek', 'proyek')}${head(esc(p.nama), acts, sub)}${lead ? '' : note('Anda Project Manager, tetapi bukan pengelola proyek ini. Aksi yang mengubah proyek (perpanjang tenggat, hapus, kelola tahapan dan anggota) dinonaktifkan.')}${t}${body(p, lead)}`;
}

function tabRingkasan(p) {
  const ts = S.tasks.filter(t => t.proyek === p.id), att = ts.filter(t => isLate(t) || (t.status === 'review' && t.pemeriksa === ME));
  return `<div class="two"><section class="card"><h2>Progres</h2><p class="b" style="font-size:1.75rem;margin:0">${p.progres}%</p>${bar(p.progres)}<p class="small mute">${ts.filter(t => t.status === 'done').length} dari ${ts.length} tugas selesai · tenggat ${fmtL(p.tenggat)}</p>
    <p>${esc(p.desk) || '<span class="mute">Belum ada deskripsi.</span>'}</p><div class="row"><span class="small mute">Anggota</span>${avs(p.anggota)}</div></section>
  <section class="card"><h2>Perlu perhatian</h2>${att.length ? att.map(t => `<div class="item"><span class="t"><b>${esc(t.judul)}</b><span class="small mute">${t.status === 'review' ? 'Menunggu diperiksa saya' : `⏰ Terlambat · tenggat ${fmt(t.tenggat)}`} · ${t.jenis} · ${STATUS_T[t.status]}</span></span>${btn('Lihat', { cls: 'sm', go: `tugas/${t.id}` })}</div>`).join('') : empty('check', 'Aman', 'Tidak ada tugas yang terlambat atau menunggu Anda.')}</section></div>`;
}

function tabTugas(p) {
  const f = S.ui.ptf || 'semua';
  const ts = S.tasks.filter(t => t.proyek === p.id && (f === 'semua' || (f === 'saya' && t.pj === ME) || (f === 'terlambat' && isLate(t)) || (f === 'periksa' && t.status === 'review' && t.pemeriksa === ME)));
  return `<div class="wrap" style="margin-bottom:.75rem">${[['semua', 'Semua'], ['saya', 'Tugas saya'], ['terlambat', 'Terlambat'], ['periksa', 'Menunggu diperiksa saya']].map(([k, l]) => chip(l, { on: f === k, act: 'ptf', arg: k })).join('')}<span class="grow"></span>${btn(`${ico('plus')} Tugas baru`, { cls: 'dark', act: 'tbaruproj', arg: p.id })}</div>
  ${ts.length ? ts.map(t => taskRow(t, false)).join('') : empty('task', 'Belum ada tugas di sini', 'Tidak ada tugas yang cocok dengan filter ini.')}`;
}

function tabTahapan(p, lead) {
  return `<div class="wrap sp-b" style="margin-bottom:.75rem"><span class="mute">${p.tahapan.filter(x => x.s === 'selesai').length} dari ${p.tahapan.length} tahapan selesai</span>${btn(`${ico('plus')} Tahapan`, { act: 'tahapbaru', arg: p.id, off: !lead })}</div>
  <div class="grid s3">${p.tahapan.map((x, i) => `<section class="card"><div class="row sp-b"><b>${esc(x.n)}</b>${badge({ selesai: 'Selesai', berjalan: 'Berjalan', belum: 'Belum mulai' }[x.s], x.s === 'belum' ? 'dash' : x.s === 'selesai' ? 'solid' : '')}</div>${bar(x.s === 'selesai' ? 100 : x.s === 'berjalan' ? 50 : 0)}${x.scope ? `<p>${badge('Scope bertambah', 'dash')}</p>` : ''}
    <p>${x.s === 'berjalan' ? btn('Selesaikan tahapan', { cls: 'sm', act: 'tahap', arg: `${p.id}:${i}:selesai`, off: !lead, busy: 400 }) : x.s === 'belum' ? btn('Mulai tahapan', { cls: 'sm', act: 'tahap', arg: `${p.id}:${i}:berjalan`, off: !lead, busy: 400 }) : ''}</p></section>`).join('')}</div>`;
}

function tabAnggota(p, lead) {
  return `<div class="wrap sp-b" style="margin-bottom:.75rem"><span class="mute">${p.anggota.length} anggota</span>${btn(`${ico('plus')} Anggota`, { act: 'anggotabaru', arg: p.id, off: !lead })}</div>
  ${p.anggota.map(m => `<div class="item">${avatar(m)}<span class="t"><b>${esc(who(m))}</b><span class="small mute">${esc(PEOPLE[m].jabatan)} · ${S.tasks.filter(t => t.proyek === p.id && t.pj === m && !['done', 'cancel'].includes(t.status)).length} tugas aktif</span></span>${m === p.lead ? badge('Lead', 'solid') : badge('Anggota')}${m === p.lead ? '' : btn('Keluarkan', { cls: 'sm', act: 'keluarkan', arg: `${p.id}:${m}`, off: !lead })}</div>`).join('')}`;
}

ACT.puq = v => { S.pu.q = v; };
ACT.puscope = k => { S.pu.scope = k; };
ACT.puview = k => { S.pu.view = k; };
ACT.pustatus = k => { S.pu.status = k; };
ACT.pusort = k => { S.pu.sort = k; };
ACT.pureset = () => { S.pu = { ...S.pu, q: '', status: 'Semua', scope: 'semua' }; };
ACT.ptf = k => { S.ui.ptf = k; };
ACT.tbaruproj = id => { S.tb.proyek = id; go('tugas/baru'); };
ACT.tahap = a => { const [id, i, s] = a.split(':'); const p = proj(id); p.tahapan[+i].s = s; toast(s === 'selesai' ? `Tahapan “${p.tahapan[+i].n}” selesai.` : `Tahapan “${p.tahapan[+i].n}” dimulai.`); };
ACT.tahapbaru = id => openModal('Tahapan baru', fld('Nama tahapan', 'th-n', inp('th-n', '', 'Contoh: Peluncuran')), [['Batal', { act: 'close' }], ['Tambah tahapan', { cls: 'dark', act: 'tahapsimpan', arg: id, busy: 400 }]]);
ACT.tahapsimpan = id => { const n = val('th-n'); if (!n) { toast('Isi nama tahapan dulu.'); return; } proj(id).tahapan.push({ n, s: 'belum' }); closeModal(); toast(`Tahapan “${n}” ditambahkan.`); };
ACT.anggotabaru = id => {
  const p = proj(id), opts = Object.keys(PEOPLE).filter(k => !p.anggota.includes(k)).map(k => [k, who(k)]);
  openModal('Tambah anggota', opts.length ? fld('Pilih orang', 'ag-p', sel('ag-p', opts)) : '<p class="mute">Semua orang di tim sudah menjadi anggota.</p>', [['Batal', { act: 'close' }], ['Tambah anggota', { cls: 'dark', act: 'anggotasimpan', arg: id, off: !opts.length, busy: 400 }]]);
};
ACT.anggotasimpan = id => { const k = val('ag-p'); proj(id).anggota.push(k); closeModal(); toast(`${who(k)} ditambahkan ke proyek.`); };
ACT.keluarkan = a => {
  const [id, m] = a.split(':'), p = proj(id), n = S.tasks.filter(t => t.proyek === id && t.pj === m && !['done', 'cancel'].includes(t.status)).length;
  confirmBox({ title: `Keluarkan ${who(m)}?`, body: `${esc(who(m))} tidak bisa lagi membuka ${esc(p.nama)}. ${n} tugas aktifnya akan menjadi tanpa penanggung jawab.`, label: 'Keluarkan anggota', onOk: () => { p.anggota = p.anggota.filter(x => x !== m); S.tasks.forEach(t => { if (t.proyek === id && t.pj === m && !['done', 'cancel'].includes(t.status)) t.pj = null; }); toast(`${who(m)} dikeluarkan dari proyek.`); } });
};
ACT.perpanjang = id => {
  const p = proj(id);
  openModal('Perpanjang tenggat', `<p class="mute small">Tenggat sekarang: ${fmtL(p.tenggat)}</p>${fld('Tenggat baru', 'pp-d', inp('pp-d', addDays(p.tenggat, 14), '', 'date'))}
    <div class="field"><span class="lbl">Alasan</span><div class="wrap" id="pp-r">${['Menunggu pihak luar', 'Scope bertambah', 'Kekurangan orang', 'Lainnya'].map((r, i) => `<label class="chip"><input type="radio" name="pp-r" value="${r}"${i ? '' : ' checked'}> ${r}</label>`).join('')}</div></div>${fld('Catatan (opsional)', 'pp-c', '<textarea id="pp-c"></textarea>')}`,
    [['Batal', { act: 'close' }], ['Simpan tenggat baru', { cls: 'dark', act: 'ppsimpan', arg: id, busy: 600 }]]);
};
ACT.ppsimpan = id => {
  const p = proj(id), d = val('pp-d');
  if (!d || d <= p.tenggat) { toast('Tenggat baru harus setelah tenggat sekarang.'); return; }
  const alasan = $('input[name=pp-r]:checked')?.value ?? 'Lainnya';
  p.tenggat = d; p.ext += 1; closeModal(); toast(`Tenggat diperpanjang ke ${fmtL(d)} (×${p.ext}). Alasan: ${alasan}.`);
};
ACT.hapusproyek = id => {
  const p = proj(id), ts = S.tasks.filter(t => t.proyek === id);
  confirmBox({ title: 'Hapus proyek?', body: `${esc(p.nama)} beserta ${ts.length} tugasnya akan dipindah ke Sampah dan bisa dipulihkan selama 30 hari.`, label: 'Hapus proyek',
    onOk: () => {
      const item = { id: `x${nextId()}`, tipe: 'Proyek', nama: p.nama, info: 'Dihapus baru saja · sisa 30 hari', payload: p, tasks: ts };
      S.projects = S.projects.filter(x => x.id !== id); S.tasks = S.tasks.filter(t => t.proyek !== id); S.trash.unshift(item);
      toast(`“${p.nama}” dipindah ke Sampah.`, () => { restoreTrash(item.id, true); });
      go('proyek');
    } });
};
