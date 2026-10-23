// ③a Event baru (ringkas), ③b Event baru (detail terbuka), dan Ubah event memakai form yang sama.
JUMPS.push(['Events', '③a Event baru (ringkas)', 'events/baru', () => { S.ui.ef = null; S.eu.ringkas = true; }], ['Events', '③b Event baru (detail terbuka)', 'events/baru', () => { S.ui.ef = null; S.eu.ringkas = false; }]);
const ef = id => {
  if (!S.ui.ef || S.ui.ef.id !== (id || 'baru')) {
    const e = id && ev(id);
    S.ui.ef = e ? { ...e } : { id: 'baru', judul: '', tgl: addDays(TODAY, 1), jam: '10:00', jenis: 'Rapat', mode: 'Tatap muka', lokasi: '', desk: '', peserta: [ME], berulang: false };
  }
  return S.ui.ef;
};
const efSave = () => { const f = S.ui.ef; f.judul = val('ef-j'); f.tgl = val('ef-t') || f.tgl; f.jam = val('ef-h') || f.jam; if ($('#ef-l')) { f.lokasi = val('ef-l'); f.desk = val('ef-d'); } };

function eventForm(id) {
  const f = ef(id), edit = !!id, det = !S.eu.ringkas || edit;
  return `${back('Semua event', 'events')}${head(edit ? 'Ubah event' : 'Event baru')}<section class="card">${fld('Judul event *', 'ef-j', inp('ef-j', f.judul, 'Contoh: Rapat mingguan tim'))}
  <div class="f2">${fld('Tanggal', 'ef-t', inp('ef-t', f.tgl, '', 'date'))}${fld('Jam', 'ef-h', inp('ef-h', f.jam, '', 'time'))}</div>
  <div class="field"><span class="lbl">Jenis</span><div class="wrap">${JENIS_E.map(j => chip(j, { on: f.jenis === j, act: 'efjenis', arg: j })).join('')}</div></div>
  <div class="field"><span class="lbl">Cara bertemu</span><div class="wrap">${['Tatap muka', 'Online'].map(j => chip(j, { on: f.mode === j, act: 'efmode', arg: j })).join('')}</div></div>
  ${det ? `${fld(f.mode === 'Online' ? 'Tautan rapat' : 'Tempat', 'ef-l', inp('ef-l', f.lokasi, f.mode === 'Online' ? 'Tempel tautan rapat' : 'Contoh: Ruang Rapat 2'))}
    <div class="field"><span class="lbl">Peserta</span><div class="wrap">${Object.keys(PEOPLE).map(k => chip(esc(who(k)), { on: f.peserta.includes(k), act: 'efpeserta', arg: k })).join('')}</div></div>
    ${fld('Deskripsi', 'ef-d', `<textarea id="ef-d">${esc(f.desk)}</textarea>`)}<label class="chk" style="margin-bottom:.8rem"><input type="checkbox" id="ef-b" ${f.berulang ? 'checked' : ''} data-act="efulang"> Ulangi setiap minggu</label>` : btn(`detail ${ico('down')}`, { cls: 'sm', act: 'efdetail' })}
  <div class="wrap" style="justify-content:flex-end;margin-top:.5rem">${btn('Batal', { go: edit ? `events/${id}` : 'events' })}${btn('Simpan', { cls: 'dark', act: 'efsimpan', arg: id || '', busy: 600 })}</div></section>`;
}

ACT.efjenis = k => { efSave(); S.ui.ef.jenis = k; };
ACT.efmode = k => { efSave(); S.ui.ef.mode = k; };
ACT.efdetail = () => { efSave(); S.eu.ringkas = false; };
ACT.efpeserta = k => { efSave(); const p = S.ui.ef.peserta; S.ui.ef.peserta = p.includes(k) ? p.filter(x => x !== k) : [...p, k]; };
ACT.efulang = () => { efSave(); S.ui.ef.berulang = !S.ui.ef.berulang; };
ACT.efsimpan = id => {
  efSave();
  const f = S.ui.ef;
  if (!f.judul) { toast('Isi judul event dulu. Judul wajib diisi.'); return; }
  if (id) { Object.assign(ev(id), { ...f, id }); toast(`Event “${f.judul}” diperbarui.`); S.ui.ef = null; go(`events/${id}`); return; }
  const nid = `e${nextId()}`;
  S.events.push({ ...f, id: nid, status: 'akan', hasil: null }); S.ui.ef = null; S.eu.ringkas = true; S.eu.tab = 'akan';
  toast(`Event “${f.judul}” dibuat.`); go(`events/${nid}`);
};
