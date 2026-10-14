// Interaksi wireframe Beranda gabungan: ukuran huruf, mode tim/sendirian, centang tugas (angka Sekilas + kartu Tasks Completed This Week), jawaban Tanya data, bacakan briefing.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// dummy: angka awal kartu Sekilas sebelum ada tugas di zona B yang dicentang
const TANPA_PEMEGANG = 3;
const DIKERJAKAN_LAIN = 3; // tugas aktif di luar daftar zona B
const SELESAI_AWAL = 12;

const ANSWERS = {
  tertinggal: `<p><b>Hajatan Keluarga</b> paling tertinggal: baru 4 dari 10 tugas selesai, padahal acara tinggal 16 hari.</p>
    <div class="bar-row"><span>Hajatan Keluarga</span><span class="bar"><i style="width:40%"></i></span><b>40%</b></div>
    <div class="bar-row"><span>Renovasi Dapur</span><span class="bar"><i style="width:70%"></i></span><b>70%</b></div>
    <div class="bar-row"><span>Arisan RT</span><span class="bar"><i style="width:90%"></i></span><b>90%</b></div>`,
  lama: `<p>Yang paling lama tertunda: <b>Bayar DP tukang keramik</b> (Renovasi Dapur), sudah lewat 2 hari.</p>`,
  sibuk: `<p><b>Rina</b> memegang tugas paling banyak minggu ini.</p>
    <div class="bar-row"><span>Rina</span><span class="bar"><i style="width:100%"></i></span><b>5</b></div>
    <div class="bar-row"><span>Dodi</span><span class="bar"><i style="width:60%"></i></span><b>3</b></div>
    <div class="bar-row"><span>Budi</span><span class="bar"><i style="width:40%"></i></span><b>2</b></div>`
};

function hitung() {
  const tugas = $$('.task');
  const selesai = tugas.filter(t => t.classList.contains('done')).length;
  $('#n-unassigned').textContent = TANPA_PEMEGANG;
  $('#n-progress').textContent = DIKERJAKAN_LAIN + tugas.length - selesai;
  $('#n-done').textContent = SELESAI_AWAL + selesai;
}

// tugas yang dicentang di zona B ikut muncul di kartu "Tasks Completed This Week"; batal centang menghapusnya
function sinkronDaftarSelesai(li, done) {
  const list = $('#done-list');
  const row = $(`[data-tid="${li.dataset.tid}"]`, list);
  if (!done) { if (row) row.remove(); return; }
  const nama = document.createElement('span');
  nama.textContent = $('.tt b', li).textContent;
  const info = document.createElement('small');
  info.textContent = 'Anda · hari ini';
  const item = document.createElement('li');
  item.dataset.tid = li.dataset.tid;
  item.append(nama, info);
  list.prepend(item);
}

function tampilkanJawaban(key) {
  $$('#chips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.q === key)));
  $('#answer').innerHTML = ANSWERS[key];
}

function pilihGrup(root, attr, onPick) {
  root.addEventListener('click', e => {
    const b = e.target.closest(`button[data-${attr}]`);
    if (!b) return;
    $$(`button[data-${attr}]`, root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    onPick(b.dataset[attr]);
  });
}

pilihGrup($('#size'), 'size', v => { document.documentElement.dataset.size = v; });
pilihGrup($('#mode'), 'mode', v => {
  document.body.dataset.mode = v;
  // chip "per orang" disembunyikan saat sendirian; kalau sedang aktif, kembali ke jawaban umum
  if (v === 'solo' && $('#chips .chip[aria-pressed=true]')?.classList.contains('team-only')) tampilkanJawaban('tertinggal');
});

$$('.task .btn').forEach(btn => btn.addEventListener('click', () => {
  const li = btn.closest('.task');
  const done = li.classList.toggle('done');
  btn.setAttribute('aria-pressed', String(done));
  btn.textContent = done ? 'Batal' : 'Selesai';
  sinkronDaftarSelesai(li, done);
  hitung();
}));

$('#chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (c) tampilkanJawaban(c.dataset.q);
});

$('#ask').addEventListener('submit', () => {
  const text = $('#ask-in').value.trim();
  if (!text) return;
  const p = document.createElement('p');
  p.textContent = `(Wireframe) Jawaban untuk "${text}" akan tampil di sini dalam kalimat biasa.`;
  $$('#chips .chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
  $('#answer').replaceChildren(p);
});

$('#bacakan').addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    $('#bacakan').lastChild.textContent = 'Suara tidak didukung';
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance($('#brief').innerText);
  u.lang = 'id-ID';
  speechSynthesis.speak(u);
});

$$('.task').forEach((li, i) => { li.dataset.tid = i; });
tampilkanJawaban('tertinggal');
hitung();
