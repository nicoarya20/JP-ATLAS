// ⑧⑨⑩ Detail tugas menurut status, ⑪ modal Kembalikan dan Batalkan tugas.
JUMPS.push(['Tugas', '⑧ Detail · Belum dikerjakan (#14)', 'tugas/14'], ['Tugas', '⑨ Detail · Sedang dikerjakan (#12)', 'tugas/12'], ['Tugas', '⑩ Detail · Menunggu diperiksa (#17)', 'tugas/17'],
  ['Tugas', '⑪ Modal Kembalikan (#17)', 'tugas/17', () => ACT.kembalikan(17)], ['Tugas', '⑪ Modal Batalkan tugas (#14)', 'tugas/14', () => ACT.batalkan(14)]);
const REASONS = ['Masih ada error', 'Belum sesuai permintaan', 'Bukti kurang jelas'];
const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);

function tugasDetail(id) {
  const t = task(id);
  if (!t) return empty('task', 'Tugas tidak ditemukan', 'Tugas ini mungkin sudah dihapus.', btn('Ke daftar tugas', { go: 'tugas' }));
  const p = proj(t.proyek), chk = mineToCheck(t);
  const acts = {
    todo: `${btn('Mulai kerjakan', { cls: 'dark', act: 'mulai', arg: id, busy: 400 })}${btn('Tandai selesai', { act: 'tandaiselesai', arg: id, busy: 400 })}`,
    doing: btn('Minta diperiksa', { cls: 'dark', act: 'mintaperiksa', arg: id }),
    review: chk ? `${btn('Setujui', { cls: 'dark', act: 'setujui', arg: id, busy: 500 })}${btn('Kembalikan', { act: 'kembalikan', arg: id })}` : '',
    done: btn('Buka lagi', { act: 'bukalagi', arg: id }), cancel: '',
  }[t.status];
  const menu = S.ui.pop === 'task' ? `<div class="pop" data-keep><button type="button" data-act="batalkan" data-arg="${id}"${aktif(t) ? '' : ' disabled'}>${ico('x')} Batalkan tugas</button></div>` : '';
  const info = [['Proyek', p ? `<a href="#/proyek/${p.id}">${esc(p.nama)}</a>` : '—'], ['Penanggung jawab', esc(who(t.pj))], ['Pemeriksa', esc(who(t.pemeriksa))], ['Tenggat', `${fmtL(t.tenggat)}${isLate(t) ? ' · ⏰ terlambat' : ''}`], ['Prioritas', t.prioritas], ['Jenis', t.jenis], ['Tag', t.tag.map(x => `<span class="tag">${esc(x)}</span>`).join(' ') || '—']];
  return `${back('Semua tugas', 'tugas')}${head(`${esc(t.judul)} <span class="mute small">#${t.id}</span>`, `${acts}<span class="pop-w">${btn(ico('dots'), { cls: 'sm', act: 'pop', arg: 'task' })}${menu}</span>`, `<p class="wrap">${badge(STATUS_T[t.status], t.status === 'done' ? 'solid' : t.status === 'review' ? 'warn' : '')}</p>`)}
  ${t.status === 'review' && !chk ? note(`Menunggu diperiksa oleh ${esc(who(t.pemeriksa))}. Hanya pemeriksa yang bisa menyetujui atau mengembalikan.`) : ''}
  ${!t.pj && aktif(t) ? note(`Tugas ini belum punya penanggung jawab. ${btn('Ambil tugas ini', { cls: 'sm', act: 'ambil', arg: id })}`) : ''}
  <div class="two"><section class="card"><h2>Deskripsi</h2><p>${esc(t.desk) || '<span class="mute">Belum ada deskripsi.</span>'}</p>${t.bukti ? `<div class="sec">Bukti dari penanggung jawab</div><div class="item">${ico('camera')}<span class="t">${esc(t.bukti)}</span></div>` : ''}${t.catatan ? `<div class="sec">Catatan pemeriksa</div><p>${esc(t.catatan)}</p>` : ''}</section>
  <section class="card"><h2>Informasi</h2>${info.map(([k, v]) => `<div class="row sp-b" style="padding:.35rem 0;border-bottom:1px solid var(--fill)"><span class="mute small">${k}</span><span>${v}</span></div>`).join('')}</section></div>`;
}

ACT.tandaiselesai = id => { const t = task(id); t.status = 'done'; toast(`“${t.judul}” ditandai selesai.`); };
ACT.ambil = id => { const t = task(id); t.pj = ME; toast('Tugas ini sekarang menjadi tanggung jawab Anda.'); };
ACT.mintaperiksa = id => {
  const t = task(id), opts = Object.keys(PEOPLE).filter(k => k !== t.pj).map(k => [k, who(k)]);
  openModal('Minta diperiksa', `${fld('Pemeriksa', 'mp-p', sel('mp-p', opts, t.pemeriksa))}${fld('Bukti pengerjaan *', 'mp-b', inp('mp-b', t.bukti, 'Contoh: tangkapan layar hasil, tautan, atau catatan singkat'))}`, [['Batal', { act: 'close' }], ['Kirim untuk diperiksa', { cls: 'dark', act: 'kirimperiksa', arg: id, busy: 600 }]]);
};
ACT.kirimperiksa = id => {
  const t = task(id), b = val('mp-b');
  if (!b) { toast('Isi bukti pengerjaan dulu supaya pemeriksa bisa menilai.'); return; }
  t.bukti = b; t.pemeriksa = val('mp-p'); t.status = 'review'; closeModal();
  if (t.pemeriksa === ME) S.inbox.perlu.unshift({ id: `i${nextId()}`, kind: 'periksa', teks: `${who(t.pj)} meminta Anda memeriksa tugas “${t.judul}”.`, waktu: 'baru saja', to: `tugas/${id}` });
  toast(`Dikirim ke ${who(t.pemeriksa)} untuk diperiksa.`);
};
ACT.setujui = id => { const t = task(id); t.status = 'done'; resolveInbox(`tugas/${id}`); toast(`“${t.judul}” disetujui dan selesai.`); };
ACT.kembalikan = id => {
  openModal('Kembalikan tugas', `<p class="mute small">Pilih alasan agar penanggung jawab tahu apa yang perlu diperbaiki.</p><div class="wrap" style="margin-bottom:.75rem">${REASONS.map(r => `<label class="chip"><input type="checkbox" name="kb" value="${r}"> ${r}</label>`).join('')}</div>${fld('Catatan (opsional)', 'kb-c', '<textarea id="kb-c"></textarea>')}`,
    [['Batal', { act: 'close' }], ['Kembalikan', { cls: 'dark', act: 'kembalikanok', arg: id, busy: 600 }]]);
};
ACT.kembalikanok = id => {
  const t = task(id), r = checked('kb'), c = val('kb-c');
  if (!r.length && !c) { toast('Pilih minimal satu alasan atau tulis catatan.'); return; }
  t.status = 'doing'; t.catatan = [...r, c].filter(Boolean).join('. '); resolveInbox(`tugas/${id}`); closeModal(); toast(`Dikembalikan ke ${who(t.pj)}.`);
};
ACT.batalkan = id => {
  const t = task(id);
  openModal('Batalkan tugas', `<p>“${esc(t.judul)}” akan ditandai Dibatalkan dan tidak muncul lagi di daftar aktif. Riwayatnya tetap tersimpan.</p>${fld('Alasan (opsional)', 'bt-a', '<textarea id="bt-a"></textarea>')}`,
    [['Kembali', { act: 'close' }], ['Batalkan tugas', { cls: 'dark', act: 'batalkanok', arg: id, busy: 500 }]]);
};
ACT.batalkanok = id => { const t = task(id); t.status = 'cancel'; closeModal(); toast(`“${t.judul}” dibatalkan.`); go('tugas'); };
