// ⑫ Pengaturan proyek: siapa yang memeriksa tugas, jenis tugas, dan tag.
JUMPS.push(['Proyek', '⑫ Pengaturan proyek (Periksa, Jenis tugas & Tag)', 'proyek/atlas/pengaturan']);
const PERIKSA = [['pengelola', 'Pengelola proyek', 'Hanya Lead proyek yang boleh memeriksa hasil tugas.'], ['ditunjuk', 'Pemeriksa yang ditunjuk per tugas', 'Tiap tugas punya pemeriksa sendiri (default).'], ['siapa', 'Siapa saja di tim', 'Anggota mana pun boleh menyetujui.']];

function proyekSet(id) {
  const p = proj(id);
  if (!p) return empty('folder', 'Proyek tidak ditemukan', '', btn('Ke daftar proyek', { go: 'proyek' }));
  const ok = isLead(p), off = !ok;
  const items = (list, kind) => list.map(x => `<span class="chip">${esc(x)}${x === 'Tugas' ? '' : `<button type="button" class="x" data-act="setdel" data-arg="${kind}:${esc(x)}" aria-label="Hapus ${esc(x)}"${off ? ' disabled' : ''}>${ico('x')}</button>`}</span>`).join('');
  const add = (kind, ph) => `<div class="row" style="margin-top:.6rem;max-width:380px">${inp(`set-${kind}`, '', ph)}${btn(`${ico('plus')} Tambah`, { cls: 'sm', act: 'setadd', arg: kind, off })}</div>`;
  return `${back(p.nama, `proyek/${id}`)}${head('Pengaturan proyek')}${ok ? '' : note('Hanya pengelola proyek yang bisa mengubah pengaturan ini.')}
  <section class="card"><h2>Siapa yang memeriksa tugas</h2>${PERIKSA.map(([k, l, d]) => `<label class="chk item"><input type="radio" name="per" ${p.periksa === k ? 'checked' : ''} ${off ? 'disabled' : ''} data-act="setperiksa" data-arg="${id}:${k}"><span class="t"><b>${l}</b><span class="small mute">${d}</span></span></label>`).join('')}</section>
  <section class="card" style="margin-top:.9rem"><h2>Jenis tugas</h2><div class="wrap">${items(p.jenis, 'jenis')}</div>${add('jenis', 'Contoh: Riset')}</section>
  <section class="card" style="margin-top:.9rem"><h2>Tag</h2><div class="wrap">${items(p.tag, 'tag')}</div>${add('tag', 'Contoh: keuangan')}</section>`;
}
const setPid = () => route()[1];
ACT.setperiksa = a => { const [id, k] = a.split(':'); proj(id).periksa = k; toast('Aturan pemeriksa disimpan.'); };
ACT.setadd = kind => {
  const v = val(`set-${kind}`), p = proj(setPid());
  if (!v) { toast('Tulis namanya dulu.'); return; }
  if (p[kind].includes(v)) { toast(`“${v}” sudah ada.`); return; }
  p[kind].push(v); toast(`“${v}” ditambahkan.`);
};
ACT.setdel = a => { const [kind, v] = a.split(':'), p = proj(setPid()); p[kind] = p[kind].filter(x => x !== v); toast(`“${v}” dihapus dari daftar.`); };
