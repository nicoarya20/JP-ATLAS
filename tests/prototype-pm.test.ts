import { beforeEach, describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Prototype PM (tahapan-proyek/04-prototype/prototype-pm) adalah HTML statis tanpa build. Test ini memuat skripnya di sandbox
// dengan DOM tiruan lalu menjaga tiga hal: semua layar bisa dirender, semua tautan/aksi punya tujuan, dan alur utama PM berjalan.
const DIR = path.join(import.meta.dir, '..', 'tahapan-proyek', '04-prototype', 'prototype-pm');
const read = (f: string) => Bun.file(path.join(DIR, f)).text();

type Fake = { innerHTML: string; value: string; textContent: string; focus(): void; setSelectionRange(): void };
type Box = { run<T>(code: string): T; get(code: string): unknown; page(route: string): string; act(name: string, arg?: string | number): void; field(id: string, v: string): void; checked(sel: string, vals: string[]): void; hash(): string };

async function load(): Promise<Box> {
  const els = new Map<string, Fake>();
  const boxes = new Map<string, { value: string }[]>();
  const el = (sel: string): Fake | undefined => {
    if (sel.startsWith('input[')) return undefined; // pilihan radio: tidak ada yang tercentang
    if (!els.has(sel)) els.set(sel, { innerHTML: '', value: '', textContent: '', focus() {}, setSelectionRange() {} });
    return els.get(sel);
  };
  const location = { hash: '' };
  const document = { querySelector: el, getElementById: () => null, querySelectorAll: (s: string) => boxes.get(s) ?? [], activeElement: null, title: '', documentElement: { style: { setProperty() {} } } };
  const ctx = vm.createContext({ document, location, window: { scrollY: 0, scrollTo() {} }, setTimeout, clearTimeout, setInterval, clearInterval, console });
  const scripts = [...(await read('index.html')).matchAll(/<script src="([^"]+)">/g)].map(m => m[1]).filter(f => f !== 'pm.boot.js');
  for (const f of scripts) vm.runInContext(await read(f), ctx, { filename: f });
  const run = <T>(code: string) => vm.runInContext(code, ctx) as T;
  const must = (sel: string) => el(sel) as Fake;
  return {
    run,
    get: (code: string) => run<unknown>(code),
    page(route) { location.hash = `#/${route}`; run('render()'); return must('#app').innerHTML; },
    act(name, arg) { run(`ACT[${JSON.stringify(name)}](${JSON.stringify(arg)})`); },
    field(id, v) { must(`#${id}`).value = v; },
    checked(sel, vals) { boxes.set(sel, vals.map(value => ({ value }))); },
    hash: () => location.hash,
  };
}

let box: Box;
const login = () => box.get('S.authed = true');
beforeEach(async () => { box = await load(); });

describe('berkas prototype', () => {
  test('setiap pm.*.js terdaftar di index.html dan tiap berkas dalam batas ukuran', async () => {
    const html = await read('index.html');
    for (const f of readdirSync(DIR).filter(n => n.endsWith('.js'))) {
      expect(html).toContain(`src="${f}"`);
      const text = await read(f);
      expect(text.split('\n').length).toBeLessThanOrEqual(500);
      expect(text.length).toBeLessThanOrEqual(20000);
    }
  });
});

describe('semua layar dan tautan', () => {
  test('setiap layar terdaftar bisa dirender, semua data-go/href mengarah ke layar nyata, semua aksi terdaftar', () => {
    login();
    const bad = /undefined|NaN|\[object|tidak ditemukan/;
    const gos = new Set<string>(), acts = new Set<string>(), problems: string[] = [];
    const scan = (label: string, html: string) => {
      if (!html || bad.test(html)) problems.push(`${label}: kosong atau mengandung teks rusak (${html.match(bad)?.[0] ?? 'kosong'})`);
      for (const m of html.matchAll(/data-go="([^"]+)"|href="#\/([^"]+)"/g)) gos.add((m[1] ?? m[2]) as string);
      for (const m of html.matchAll(/data-(?:act|change|live|submit)="([^"]+)"/g)) acts.add(m[1] as string);
    };
    const total = box.run<number>('JUMPS.length');
    expect(total).toBeGreaterThan(50);
    for (let i = 0; i < total; i++) {
      const html = box.run<string>(`(() => { const [, label, to, prep] = JUMPS[${i}]; if (!AUTH.has(to.split('/')[0])) S.authed = true; if (prep) prep(); location.hash = '#/' + to; render(); return label + '\u0000' + document.querySelector('#app').innerHTML + (S.modal ? S.modal.body : ''); })()`);
      const [label, body] = html.split('\u0000') as [string, string];
      scan(label, body);
    }
    box.get('S = seed(); S.authed = true'); // lompatan tadi sengaja mengubah data (mis. menghapus event); mulai bersih untuk telusur tautan
    const seen = new Set<string>();
    for (const to of gos) { if (seen.has(to)) continue; seen.add(to); scan(`tautan ${to}`, box.page(to)); }
    const missing = [...acts].filter(a => !box.run<boolean>(`!!ACT[${JSON.stringify(a)}]`));
    expect(problems).toEqual([]);
    expect(missing).toEqual([]);
  });
});

describe('alur masuk', () => {
  test('akun Nico masuk ke Beranda, akun baru ke halaman menunggu persetujuan', () => {
    box.act('masuk', 'baru');
    expect(box.hash()).toBe('#/menunggu');
    expect(box.get('S.authed')).toBe(false);
    box.act('masuk', 'nico');
    expect(box.hash()).toBe('#/beranda');
    expect(box.get('S.authed')).toBe(true);
  });
  test('layar terproteksi mengarahkan ke login saat belum masuk', () => {
    box.page('proyek');
    expect(box.hash()).toBe('#/login');
  });
});

describe('proyek', () => {
  beforeEach(login);
  test('form proyek menolak nama kosong lalu membuat proyek dan membukanya', () => {
    const n = box.run<number>('S.projects.length');
    box.act('pfbuat');
    expect(box.get('S.projects.length')).toBe(n);
    box.field('pf-n', 'Kantor Baru');
    box.act('pfbuat');
    expect(box.get('S.projects.length')).toBe(n + 1);
    expect(box.hash()).toMatch(/^#\/proyek\/kantor-baru-/);
  });
  test('draf AI dan template sama-sama membuat tugas awal', () => {
    box.field('ai-t', AI_TEXT);
    box.act('aisusun');
    expect(box.hash()).toBe('#/proyek/baru/draf');
    expect(box.get('S.ui.draf.tasks.length')).toBe(8);
    box.act('drafjenis', 0);
    expect(box.get('S.ui.draf.tasks[0][1]')).toBe('Bug');
    box.act('drafbuat');
    box.act('tplpilih', 'acara');
    box.field('tp-n', 'Syukuran');
    box.act('tplbuat');
    expect(box.get('S.tasks.filter(t => t.proyek.startsWith("syukuran")).length')).toBe(5);
  });
  test('perpanjang tenggat menolak tanggal mundur dan menambah penghitung bila valid', () => {
    box.field('pp-d', '2026-10-01');
    box.act('ppsimpan', 'atlas');
    expect(box.get('proj("atlas").ext')).toBe(1);
    box.field('pp-d', '2026-11-14');
    box.act('ppsimpan', 'atlas');
    expect(box.get('proj("atlas").ext')).toBe(2);
    expect(box.get('proj("atlas").tenggat')).toBe('2026-11-14');
  });
  test('PM bukan pengelola: tombol ubah dinonaktifkan', () => {
    const html = box.page('proyek/sinar');
    expect(html).toMatch(/Perpanjang tenggat<\/button>/);
    expect(html).toMatch(/disabled title="Hanya pengelola proyek/);
    expect(box.page('proyek/atlas')).not.toMatch(/disabled title="Hanya pengelola proyek/);
  });
  test('hapus proyek lewat dialog masuk Sampah dan bisa diurungkan', () => {
    box.act('hapusproyek', 'atlas');
    expect(box.get('!!S.modal')).toBe(true);
    expect(box.run<string>('S.modal.body')).toContain('beserta 7 tugasnya');
    box.act('ok');
    expect(box.get('!!proj("atlas")')).toBe(false);
    expect(box.get('S.trash[0].nama')).toBe('Proyek Atlas');
    box.act('undo');
    expect(box.get('!!proj("atlas")')).toBe(true);
    expect(box.get('S.tasks.filter(t => t.proyek === "atlas").length')).toBe(7);
  });
  test('keluarkan anggota melepas penanggung jawab tugas aktifnya', () => {
    box.act('keluarkan', 'atlas:dodi');
    box.act('ok');
    expect(box.get('proj("atlas").anggota.includes("dodi")')).toBe(false);
    expect(box.get('task(16).pj')).toBe(null);
  });
});

const AI_TEXT = 'Saya ingin membuat aplikasi absensi untuk kantor, dibantu Dodi dan Ayu.';

describe('tugas', () => {
  beforeEach(login);
  test('mulai, minta diperiksa (wajib bukti), lalu setujui dan inbox ikut bersih', () => {
    box.act('mulai', 14);
    expect(box.get('task(14).status')).toBe('doing');
    box.field('mp-p', 'nico');
    box.act('kirimperiksa', 14);
    expect(box.get('task(14).status')).toBe('doing');
    box.field('mp-b', 'tangkapan layar');
    box.act('kirimperiksa', 14);
    expect(box.get('task(14).status')).toBe('review');
    expect(box.get('S.inbox.perlu.some(i => i.to === "tugas/14")')).toBe(true);
    box.act('setujui', 14);
    expect(box.get('task(14).status')).toBe('done');
    expect(box.get('S.inbox.perlu.some(i => i.to === "tugas/14")')).toBe(false);
  });
  test('kembalikan butuh alasan dan menyelesaikan item inbox pemeriksaan', () => {
    box.act('kembalikanok', 17);
    expect(box.get('task(17).status')).toBe('review');
    box.checked('input[name="kb"]:checked', ['Bukti kurang jelas']);
    box.act('kembalikanok', 17);
    expect(box.get('task(17).status')).toBe('doing');
    expect(box.get('task(17).catatan')).toBe('Bukti kurang jelas');
    expect(box.get('S.inbox.perlu.some(i => i.to === "tugas/17")')).toBe(false);
  });
  test('detail tugas menunggu diperiksa menampilkan Setujui hanya untuk pemeriksa', () => {
    expect(box.page('tugas/17')).toContain('data-act="setujui"');
    box.get('task(17).pemeriksa = "ayu"');
    const html = box.page('tugas/17');
    expect(html).not.toContain('data-act="setujui"');
    expect(html).toContain('Menunggu diperiksa oleh Ayu Lestari');
  });
  test('batalkan tugas lewat dialog lalu hilang dari daftar aktif', () => {
    box.act('batalkanok', 12);
    expect(box.get('task(12).status')).toBe('cancel');
    expect(box.page('tugas')).not.toContain('Susun rancangan halaman login');
  });
  test('Tulis saja: nama ganda minta dipilih, hari dan prioritas terbaca', () => {
    const [a, b] = box.run<{ pj: string | null; cands: string[]; tenggat: string; prioritas: string; jenis: string }[]>('parseTasks(S.tb.text)') as [{ pj: string | null; cands: string[]; tenggat: string; prioritas: string; jenis: string }, { pj: string | null; tenggat: string }];
    expect(a.pj).toBeNull();
    expect(a.cands).toEqual(['rina', 'rinap']);
    expect([a.tenggat, a.prioritas, a.jenis]).toEqual(['2026-10-09', 'Tinggi', 'Bug']);
    expect([b.pj, b.tenggat]).toEqual(['dodi', '2026-10-09']);
    box.field('tb-t', box.run<string>('S.tb.text'));
    box.act('tbsusun');
    expect(box.page('tugas/baru')).toMatch(/disabled title="Pilih penanggung jawab dulu"/);
    box.act('tbpilih', '0:rinap');
    expect(box.page('tugas/baru')).not.toMatch(/Pilih penanggung jawab dulu/);
    const n = box.run<number>('S.tasks.length');
    box.act('tbsimpan');
    expect(box.get('S.tasks.length')).toBe(n + 2);
  });
  test('form tugas menolak judul kosong; impor CSV hanya memasukkan baris valid', () => {
    const n = box.run<number>('S.tasks.length');
    box.act('tfsimpan');
    expect(box.get('S.tasks.length')).toBe(n);
    box.get('S.tb.csvTab = "tempel"');
    box.field('cv-t', 'judul,penanggung jawab,tenggat,prioritas\nUji A,Dodi,2026-10-20,Tinggi\n,Rina,2026-10-21,Sedang\nUji C,Ayu,besok,Rendah');
    box.act('cvimpor');
    expect(box.get('S.tasks.length')).toBe(n + 1);
  });
  test('tile Unassigned di Beranda membuka daftar tugas tanpa penanggung jawab', () => {
    box.act('tile', 'unassigned');
    const html = box.page('tugas');
    expect(html).toContain('Tentukan teks pesan galat');
    expect(html).not.toContain('Susun rancangan halaman login');
  });
  test('Selesai di My Focus menandai tugas dan bisa diurungkan', () => {
    box.act('selesai', 61);
    expect(box.get('task(61).status')).toBe('done');
    box.act('undo');
    expect(box.get('task(61).status')).toBe('todo');
  });
});

describe('events, inbox, sampah, pengaturan', () => {
  beforeEach(login);
  test('rekam: wajib persetujuan peserta, lalu hasil dikonfirmasi membuat tugas dan menyelesaikan inbox', () => {
    expect(box.page('events/e1/rekam')).toContain('disabled title="Centang dulu persetujuan peserta"');
    box.act('rekizin');
    expect(box.page('events/e1/rekam')).not.toContain('Centang dulu persetujuan');
    box.act('rekmulai');
    expect(box.get('S.rekam.on')).toBe(true);
    box.act('rekselesai');
    expect(box.get('S.rekam.on')).toBe(false);
    const n = box.run<number>('S.tasks.length');
    box.page('events/e4/langkah/3');
    box.act('rekbuang', 1);
    box.field('rk-p', 'atlas');
    box.act('rekbuat', 'e4');
    expect(box.get('S.tasks.length')).toBe(n + 1);
    expect(box.get('ev("e4").hasil.ok')).toBe(true);
    expect(box.get('S.inbox.perlu.some(i => i.to === "events/e4")')).toBe(false);
  });
  test('event baru wajib judul; hapus event masuk Sampah dan bisa diurungkan', () => {
    const n = box.run<number>('S.events.length');
    box.page('events/baru');
    box.act('efsimpan', '');
    expect(box.get('S.events.length')).toBe(n);
    box.field('ef-j', 'Rapat vendor baru');
    box.act('efsimpan', '');
    expect(box.get('S.events.length')).toBe(n + 1);
    box.act('ehapusok', 'e2');
    expect(box.get('!!ev("e2")')).toBe(false);
    box.act('undo');
    expect(box.get('!!ev("e2")')).toBe(true);
  });
  test('kalender menampilkan event bulan berjalan dan pindah bulan', () => {
    box.get('S.eu.view = "kalender"');
    expect(box.page('events')).toContain('Oktober 2026');
    expect(box.page('events')).toContain('Kickoff Atlas');
    box.act('ebulan', 1);
    expect(box.page('events')).toContain('November 2026');
    box.act('ehariini');
    expect(box.page('events')).toContain('Oktober 2026');
  });
  test('inbox: setujui perpanjangan mengundur tenggat; kosong menampilkan empty state', () => {
    box.act('izin', 'i4:setuju');
    box.act('ok');
    expect(box.get('proj("migrasi").tenggat')).toBe('2026-10-14');
    box.get('S.inbox.perlu = []');
    expect(box.page('inbox')).toContain('Semua beres');
    expect(box.get('inboxCount()')).toBe(0);
  });
  test('sampah: tugas dari proyek terhapus terkunci sampai proyeknya dipulihkan', () => {
    expect(box.page('sampah')).toContain('Pulihkan (nonaktif)');
    box.act('pulihkan', 'x1');
    expect(box.page('sampah')).not.toContain('Pulihkan (nonaktif)');
    expect(box.get('!!proj("pabrik")')).toBe(true);
  });
  test('cuti: tanggal mundur ditolak, lalu pengajuan, persetujuan admin, dan pembatalan', () => {
    box.field('ct-a', '2026-10-20');
    box.field('ct-b', '2026-10-19');
    box.act('cutisimpan');
    expect(box.get('S.cuti.state')).toBe('none');
    box.field('ct-b', '2026-10-22');
    box.act('cutisimpan');
    expect(box.get('S.cuti.state')).toBe('diajukan');
    box.act('cutiadmin', 'aktif');
    expect(box.page('pengaturan/keadaan')).toContain('Batalkan cuti');
    box.act('cutibatal', 'cuti');
    box.act('ok');
    expect(box.get('S.cuti.state')).toBe('none');
  });
  test('keluar dari akun meminta konfirmasi lalu kembali ke login', () => {
    box.act('keluar');
    expect(box.run<string>('S.modal.body')).toContain('Kamu akan keluar dari akun ini');
    box.act('ok');
    expect(box.get('S.authed')).toBe(false);
    expect(box.hash()).toBe('#/login');
  });
});
