// Inbox: ① Perlu Anda tanggapi, ② Kabar terbaru, ③ Kosong (semua beres).
JUMPS.push(['Inbox', '① Perlu Anda tanggapi', 'inbox'], ['Inbox', '② Kabar terbaru', 'inbox/kabar'], ['Inbox', '③ Kosong (semua beres)', 'inbox/kosong']);
const resolveInbox = to => { S.inbox.perlu = S.inbox.perlu.filter(i => i.to !== to); };
const drop = id => { S.inbox.perlu = S.inbox.perlu.filter(i => i.id !== id); };
const inboxAct = i => ({
  periksa: btn('Periksa', { cls: 'sm dark', go: i.to }),
  hasil: btn('Periksa hasil', { cls: 'sm dark', go: i.to }),
  balas: btn('Balas', { cls: 'sm dark', act: 'balas', arg: i.id }),
  izin: `${btn('Tolak', { cls: 'sm', act: 'izin', arg: `${i.id}:tolak` })}${btn('Setujui', { cls: 'sm dark', act: 'izin', arg: `${i.id}:setuju` })}`,
}[i.kind]);

SCREENS.inbox = ([sub]) => {
  const tab = sub === 'kabar' ? 'kabar' : 'perlu', list = sub === 'kosong' ? [] : S.inbox.perlu;
  const t = tabs([['perlu', `Perlu Anda tanggapi${list.length ? ` (${list.length})` : ''}`], ['kabar', 'Kabar terbaru']], tab, k => ({ go: k === 'perlu' ? 'inbox' : 'inbox/kabar' }));
  if (tab === 'kabar') {
    return `${head('Inbox', btn('Tandai semua dibaca', { cls: 'sm', act: 'bacasemua', off: S.inbox.read }))}${t}${S.inbox.kabar.map((k, n) => `<div class="item"><span class="t"><b>${esc(k.teks)}</b><span class="small mute">${k.waktu}</span></span>${n < 2 && !S.inbox.read ? badge('Baru', 'solid') : ''}${btn('Lihat', { cls: 'sm', go: k.to })}</div>`).join('')}`;
  }
  return `${head('Inbox')}${t}${list.length ? list.map(i => `<div class="item"><span class="t"><b>${esc(i.teks)}</b><span class="small mute">${i.waktu}</span></span><span class="wrap">${inboxAct(i)}</span></div>`).join('')
    : empty('check', 'Semua beres', 'Tidak ada yang perlu Anda tanggapi sekarang.', btn('Lihat Kabar terbaru', { go: 'inbox/kabar' }))}`;
};

ACT.bacasemua = () => { S.inbox.read = true; toast('Semua kabar ditandai sudah dibaca.'); };
ACT.balas = id => {
  const i = S.inbox.perlu.find(x => x.id === id);
  openModal('Balas pesan Rina', `<p class="mute small">${esc(i.teks)}</p>${fld('Balasan Anda', 'balas-t', '<textarea id="balas-t" placeholder="Tulis balasan…"></textarea>')}`, [['Batal', { act: 'close' }], ['Kirim balasan', { cls: 'dark', act: 'kirimbalas', arg: id, busy: 600 }]]);
};
ACT.kirimbalas = id => {
  if (!val('balas-t')) { toast('Tulis balasan dulu sebelum mengirim.'); return; }
  drop(id); closeModal(); toast('Balasan terkirim ke Rina.');
};
ACT.izin = a => {
  const [id, aksi] = a.split(':'), tolak = aksi === 'tolak';
  confirmBox({
    title: tolak ? 'Tolak perpanjangan tenggat?' : 'Setujui perpanjangan tenggat?',
    body: tolak ? 'Tenggat Migrasi Data Lama tetap 30 Sep dan Dodi akan diberi tahu penolakan ini.' : 'Tenggat Migrasi Data Lama diundur menjadi 14 Okt dan tercatat sebagai “Diperpanjang ×1”.',
    label: tolak ? 'Tolak permintaan' : 'Setujui permintaan',
    onOk: () => { if (!tolak) { const p = proj('migrasi'); p.tenggat = '2026-10-14'; p.ext += 1; p.kond = 'warn'; p.info = 'tenggat diundur'; } drop(id); toast(tolak ? 'Permintaan ditolak.' : 'Perpanjangan disetujui.'); },
  });
};
