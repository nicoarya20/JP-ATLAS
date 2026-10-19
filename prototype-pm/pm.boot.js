// Pasang event global (klik, input, change, submit, Esc), isi menu lompat, lalu render layar pertama.
function onClick(e) {
  if (e.target.classList.contains('modal-bg')) { closeModal(); return; }
  const el = e.target.closest('[data-go],[data-act]');
  if (!el) { if (S.ui.pop && !e.target.closest('[data-keep]')) { S.ui.pop = null; render(); } return; }
  if (el.disabled) return;
  S.ui.popPrev = S.ui.pop;
  S.ui.pop = null;
  const run = () => {
    const { act, arg, go: to } = el.dataset;
    if (act) { if (!ACT[act]) throw new Error(`Aksi tidak dikenal: ${act}`); ACT[act](arg, el); }
    if (to) go(to); else render();
  };
  const ms = Number(el.dataset.busy);
  if (ms) { el.disabled = true; el.classList.add('loading'); setTimeout(run, ms); } else run();
}
document.addEventListener('click', onClick);
document.addEventListener('input', e => { const a = e.target.dataset.live; if (a) { ACT[a](e.target.value); render(); } });
document.addEventListener('change', e => { const a = e.target.dataset.change; if (a) { ACT[a](e.target.value); render(); } });
document.addEventListener('submit', e => { e.preventDefault(); const a = e.target.dataset.submit; if (a) { ACT[a](); render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.modal) closeModal(); });
window.addEventListener('hashchange', render);

const jump = $('#jump');
for (const g of [...new Set(JUMPS.map(j => j[0]))]) {
  const og = document.createElement('optgroup');
  og.label = g;
  JUMPS.forEach(([grp, label], i) => { if (grp === g) og.append(new Option(label, i)); });
  jump.append(og);
}
// Lompat langsung ke layar mana pun: anggap sudah login (kecuali layar masuk), jalankan persiapan state bila ada.
jump.addEventListener('change', () => {
  if (jump.value === '') return;
  const [, , to, prep] = JUMPS[Number(jump.value)];
  if (!AUTH.has(to.split('/')[0])) S.authed = true;
  closeModal();
  if (prep) prep();
  go(to);
});
$('#reset').addEventListener('click', () => { S = seed(); applyTextSize(); renderModal(); renderToast(); go('login'); });
applyTextSize();
render();
