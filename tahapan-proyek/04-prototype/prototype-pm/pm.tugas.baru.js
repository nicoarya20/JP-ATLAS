// Tugas baru: ⑤ Tulis saja ✦ (AI menyusun dari kalimat), ⑥ Isi form, ⑦ Impor CSV.
JUMPS.push(['Tugas', '⑤ Tugas baru · Tulis saja ✦', 'tugas/baru', () => { S.tb.mode = 'tulis'; }], ['Tugas', '⑥ Tugas baru · Isi form', 'tugas/baru', () => { S.tb.mode = 'form'; }], ['Tugas', '⑦ Impor CSV', 'tugas/impor']);
const WEEKDAY = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };
const CSV_SAMPLE = 'judul,penanggung jawab,tenggat,prioritas\nSiapkan akun email klien,Rina,2026-10-14,Sedang\nUji alur pembayaran,Dodi,2026-10-16,Tinggi\nTulis catatan rilis,Ayu,2026-10-20,Rendah\nPesan domain baru,Nico,2026-10-12,Sedang';

// Menyusun tugas dari kalimat bebas: satu baris = satu tugas. Nama ganda (Rina) ditandai agar dipilih manual.
function parseTasks(text) {
  return text.split(/\n|;/).map(s => s.trim()).filter(Boolean).map(line => {
    const low = line.toLowerCase();
    const cands = Object.keys(PEOPLE).filter(k => new RegExp(`\\b${PEOPLE[k].n.toLowerCase()}\\b`).test(low));
    const full = Object.keys(PEOPLE).filter(k => low.includes(PEOPLE[k].full.toLowerCase()));
    const pj = full.length === 1 ? full[0] : cands.length === 1 ? cands[0] : null;
    const day = Object.keys(WEEKDAY).find(d => new RegExp(`\\b${d}\\b`).test(low)); // \b: “mingguan” bukan hari Minggu
    let tenggat = addDays(TODAY, 7);
    if (low.includes('besok')) tenggat = addDays(TODAY, 1);
    else if (low.includes('hari ini')) tenggat = TODAY;
    else if (day) { const n = (WEEKDAY[day] - new Date(`${TODAY}T00:00:00`).getDay() + 7) % 7 || 7; tenggat = addDays(TODAY, n); }
    const prioritas = /kritis/.test(low) ? 'Kritis' : /tinggi/.test(low) ? 'Tinggi' : /rendah/.test(low) ? 'Rendah' : 'Sedang';
    const judul = cap(line.replace(/,?\s*prioritas \w+/i, '').replace(/\b(besok|hari ini|hari \w+)\b/gi, '').replace(/\s+/g, ' ').trim());
    return { judul, pj, cands: pj ? [] : cands, tenggat, prioritas, jenis: /bug|galat|error/.test(low) ? 'Bug' : 'Tugas' };
  });
}

function tugasBaru() {
  const b = S.tb, pre = b.proyek || 'atlas';
  const modeSeg = seg([['tulis', 'Tulis saja ✦'], ['form', 'Isi form']], b.mode, k => ({ act: 'tbmode', arg: k }));
  const head1 = `${back('Semua tugas', 'tugas')}${head('Tugas baru', modeSeg)}`;
  if (b.mode === 'form') {
    return `${head1}<section class="card">${fld('Judul tugas *', 'tf-j', inp('tf-j', '', 'Contoh: Susun daftar belanja'))}
    <div class="f2">${fld('Proyek', 'tf-p', sel('tf-p', S.projects.map(p => [p.id, p.nama]), pre))}${fld('Penanggung jawab', 'tf-pj', sel('tf-pj', [['', 'Belum ada'], ...Object.keys(PEOPLE).map(k => [k, who(k)])], ME))}</div>
    <div class="f2">${fld('Tenggat', 'tf-t', inp('tf-t', addDays(TODAY, 7), '', 'date'))}${fld('Pemeriksa', 'tf-pe', sel('tf-pe', Object.keys(PEOPLE).map(k => [k, who(k)]), ME))}</div>
    <div class="f2">${fld('Prioritas', 'tf-pr', sel('tf-pr', PRIORITAS.map(x => [x, x]), 'Sedang'))}${fld('Jenis', 'tf-je', sel('tf-je', [['Tugas', 'Tugas'], ['Bug', 'Bug']], 'Tugas'))}</div>
    ${fld('Deskripsi', 'tf-d', '<textarea id="tf-d"></textarea>')}<div class="wrap" style="justify-content:flex-end">${btn('Batal', { go: 'tugas' })}${btn('Simpan', { cls: 'dark', act: 'tfsimpan', busy: 600 })}</div></section>`;
  }
  const ps = b.parsed, open = ps ? ps.filter(x => !x.pj).length : 0;
  return `${head1}<section class="card">${fld('Tulis saja, AI yang menyusun', 'tb-t', `<textarea id="tb-t">${esc(b.text)}</textarea>`)}<p class="small mute">Satu baris = satu tugas. Sebut nama, hari (besok, Jumat), dan prioritas bila perlu.</p>
    <div class="wrap" style="justify-content:flex-end">${btn(`Susun ${ico('spark')}`, { cls: 'dark', act: 'tbsusun', busy: 800 })}</div></section>
  ${ps ? `<div class="sec">Hasil susunan · ${ps.length} tugas</div>${ps.map((x, i) => `<div class="card" style="margin-bottom:.5rem"><b>${esc(x.judul)}</b><div class="wrap" style="margin:.5rem 0">${chip(`Mengerjakan: ${esc(x.pj ? who(x.pj) : 'belum dipilih')}`, { cls: x.pj ? '' : 'dash' })}${chip(`Tenggat: ${fmt(x.tenggat)} (${hari(x.tenggat)})`)}${chip(`Prioritas: ${x.prioritas}`)}${chip(`Jenis: ${x.jenis}`)}</div>
    ${x.pj ? '' : `<p class="small mute">Ada lebih dari satu orang bernama itu. Pilih yang dimaksud:</p><div class="wrap">${(x.cands.length ? x.cands : Object.keys(PEOPLE)).map(k => chip(esc(who(k)), { act: 'tbpilih', arg: `${i}:${k}` })).join('')}</div>`}</div>`).join('')}
    <div class="wrap" style="justify-content:flex-end">${btn('Ubah tulisan', { act: 'tbubah' })}${btn(`Simpan ${ps.length} tugas`, { cls: 'dark', act: 'tbsimpan', off: open > 0, title: open ? 'Pilih penanggung jawab dulu' : '', busy: 600 })}</div>` : ''}`;
}

function tugasImpor() {
  const b = S.tb, rows = b.csvTab === 'tempel' ? csvRows(b.csvText ?? CSV_SAMPLE) : b.csv ? csvRows(CSV_SAMPLE) : [];
  const ok = rows.filter(r => r.ok).length;
  const body = b.csvTab === 'tempel'
    ? fld('Tempel isi CSV', 'cv-t', `<textarea id="cv-t" style="min-height:9rem;font-family:monospace">${esc(b.csvText ?? CSV_SAMPLE)}</textarea>`) + btn('Periksa isi', { cls: 'sm', act: 'cvperiksa' })
    : `<div class="empty">${ico('folder')}<h3>${b.csv ? 'tugas-atlas.csv' : 'Belum ada file'}</h3><p class="mute">${b.csv ? '4 baris terbaca.' : 'Pilih file .csv dari komputer Anda.'}</p>${btn(b.csv ? 'Ganti file' : 'Pilih file', { act: 'cvfile' })}</div>`;
  return `${back('Semua tugas', 'tugas')}${head('Impor CSV', btn('Unduh contoh CSV', { cls: 'sm', act: 'unduhcsv', busy: 600 }))}
  <section class="card">${tabs([['unggah', 'Unggah file'], ['tempel', 'Tempel teks']], b.csvTab, k => ({ act: 'cvtab', arg: k }))}${body}
  ${rows.length ? `<div class="sec">Pratinjau · ${ok} dari ${rows.length} baris siap diimpor</div>${rows.map(r => `<div class="item"><span class="t"><b>${esc(r.judul || '(judul kosong)')}</b><span class="small mute">${esc(r.pjt || 'tanpa penanggung jawab')} · ${r.tenggat ? fmt(r.tenggat) : 'tanpa tenggat'} · ${r.prioritas}</span></span>${r.ok ? badge('Siap', 'solid') : badge('Perlu diperbaiki', 'warn')}</div>`).join('')}` : ''}
  <div class="wrap" style="justify-content:flex-end;margin-top:1rem">${btn('Batal', { go: 'tugas' })}${btn(`Impor ${ok} tugas`, { cls: 'dark', act: 'cvimpor', off: !ok, title: ok ? '' : 'Belum ada baris yang siap diimpor', busy: 800 })}</div></section>`;
}
function csvRows(text) {
  return text.split('\n').slice(1).filter(l => l.trim()).map(l => {
    const [judul = '', pjt = '', tenggat = '', prioritas = 'Sedang'] = l.split(',').map(s => s.trim());
    const pj = Object.keys(PEOPLE).find(k => PEOPLE[k].n.toLowerCase() === pjt.toLowerCase()) || null;
    return { judul, pjt, pj, tenggat, prioritas: PRIORITAS.includes(prioritas) ? prioritas : 'Sedang', ok: !!judul && /^\d{4}-\d{2}-\d{2}$/.test(tenggat) };
  });
}

ACT.tbmode = k => { S.tb.mode = k; };
ACT.tbsusun = () => { const t = val('tb-t'); if (!t) { toast('Tulis dulu tugasnya, satu baris per tugas.'); return; } S.tb.text = t; S.tb.parsed = parseTasks(t); };
ACT.tbubah = () => { S.tb.parsed = null; };
ACT.tbpilih = a => { const [i, k] = a.split(':'); S.tb.parsed[+i].pj = k; };
const baru = (x, proyek) => { const id = nextId(); S.tasks.push(T(id, x.judul, proyek, 'todo', x.pj, x.tenggat, { prioritas: x.prioritas, jenis: x.jenis, desk: x.desk || '', pemeriksa: x.pemeriksa || ME })); return id; };
ACT.tbsimpan = () => { const pr = S.tb.proyek || 'atlas'; S.tb.parsed.forEach(x => baru(x, pr)); const n = S.tb.parsed.length; S.tb.parsed = null; toast(`${n} tugas disimpan.`); S.tu.scope = 'semua'; S.tu.filter = 'aktif'; go('tugas'); };
ACT.tfsimpan = () => {
  const j = val('tf-j');
  if (!j) { toast('Isi judul tugas dulu. Judul wajib diisi.'); return; }
  const id = baru({ judul: j, pj: val('tf-pj') || null, tenggat: val('tf-t') || addDays(TODAY, 7), prioritas: val('tf-pr'), jenis: val('tf-je'), desk: val('tf-d'), pemeriksa: val('tf-pe') }, val('tf-p'));
  toast(`Tugas “${j}” disimpan.`); go(`tugas/${id}`);
};
ACT.cvtab = k => { S.tb.csvTab = k; };
ACT.cvfile = () => { S.tb.csv = true; };
ACT.cvperiksa = () => { S.tb.csvText = val('cv-t'); };
ACT.cvimpor = () => {
  const rows = (S.tb.csvTab === 'tempel' ? csvRows(val('cv-t') || S.tb.csvText || CSV_SAMPLE) : csvRows(CSV_SAMPLE)).filter(r => r.ok), pr = S.tu.proyek || 'atlas';
  rows.forEach(r => baru({ judul: r.judul, pj: r.pj, tenggat: r.tenggat, prioritas: r.prioritas, jenis: 'Tugas' }, pr));
  S.tb.csv = false; S.tb.csvText = undefined; toast(`${rows.length} tugas diimpor ke ${proj(pr).nama}.`); S.tu.scope = 'semua'; go('tugas');
};
