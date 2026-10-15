// Interaksi khusus wireframe 05 Rapat & Events: kalender bulan + demo siklus badge catatan rapat.
// Kalender bulan Oktober 2026 (1 Okt = Kamis). Angka di tiap tanggal = jumlah rapat, demo saja.
const busy = { 1: 1, 5: 2, 6: 2, 7: 2, 8: 1, 9: 2, 13: 1, 14: 2, 20: 1, 21: 1, 27: 1, 29: 2 };
const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => `<div class="dn">${d}</div>`);
const cells = [];
for (let i = 0; i < 35; i++) {
  const n = i - 2; // grid mulai Senin 28 Sep
  const inMonth = n >= 1 && n <= 31;
  const label = inMonth ? n : n < 1 ? 30 + n : n - 31;
  const lines = inMonth ? '<span class="ln" style="width:85%"></span>'.repeat(busy[n] || 0) : '';
  cells.push(`<div class="md${inMonth ? '' : ' out'}${n === 6 ? ' today' : ''}">${label}${lines}</div>`);
}
document.getElementById('month').innerHTML = days.join('') + cells.join('');
document.querySelector('#t-cal .seg').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) document.getElementById('cal-label').textContent = b.dataset.show === 'cal-month' ? 'Oktober 2026' : '5 – 11 Oktober 2026';
});

// Demo siklus badge di kartu "Sedang berlangsung": consent → merekam → diproses AI → perlu dicek.
const st = document.getElementById('live-st');
const acts = document.getElementById('live-acts');
const consent = document.getElementById('consent');
const setSt = (cls, html) => { st.className = `st ${cls}`; st.innerHTML = html; };
let timer;
document.getElementById('btn-rec').addEventListener('click', () => { consent.classList.add('show'); acts.hidden = true; });
document.getElementById('btn-no').addEventListener('click', () => { consent.classList.remove('show'); acts.hidden = false; });
document.getElementById('btn-ok').addEventListener('click', () => {
  consent.classList.remove('show');
  let sec = 0;
  const clock = () => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  setSt('st-rec', `Merekam ${clock()}`);
  timer = setInterval(() => { sec++; st.textContent = `Merekam ${clock()}`; }, 1000);
  acts.innerHTML = '<button class="btn dark lg" type="button" id="btn-stop">■ Selesai catat</button><button class="btn lg" type="button"><svg class="ico"><use href="#i-camera"/></svg>Tambah foto</button>';
  acts.hidden = false;
  document.getElementById('btn-stop').addEventListener('click', () => {
    clearInterval(timer);
    setSt('', '<svg class="ico"><use href="#i-clock"/></svg>Diproses AI');
    acts.innerHTML = '<span class="muted">AI sedang menyusun draf catatan. Kamu boleh tinggalkan halaman ini; nanti muncul di "Perlu dicek".</span>';
    setTimeout(() => {
      setSt('st-check', '<svg class="ico"><use href="#i-alert"/></svg>Perlu dicek (6)');
      acts.innerHTML = '<button class="btn dark lg" type="button">Cek sekarang</button>';
    }, 2500);
  });
});
