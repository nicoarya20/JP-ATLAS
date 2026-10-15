# BRIEF BERSAMA — Modernisasi PM Dashboard (Oktober 2026)

## Konteks
- Sumber kebenaran fitur lama: `/Users/lukman/orca/projects/new-pm/note.md` (WAJIB dibaca utuh).
- Fitur di note.md adalah catatan ulang fitur LAMA, belum menyesuaikan perkembangan AI.
- Tanggal sekarang: **Oktober 2026**. Lanskap AI saat ini: agen AI otonom yang bisa mengerjakan task
  (coding agent, research agent), MCP (Model Context Protocol) sebagai standar integrasi tool,
  LLM multimodal (voice, foto, dokumen) murah & cepat, natural-language query atas data,
  ringkasan/briefing otomatis, AI triage, prediksi risiko, dsb. Riset web untuk memvalidasi tren PM tools 2025–2026 (Linear, Jira/Rovo, Asana AI Studio,
  ClickUp Brain, Notion AI, Height, Plane, dll). Sebut sumbernya.
- **RISET WEB: WebSearch/WebFetch TERBLOKIR sandbox. Gunakan skill `ego-browser`** (panggil via Skill tool,
  baca instruksinya). Buka TAB SENDIRI dan pakai page id milikmu sendiri — jangan menutup/menavigasi tab
  worker lain. Batasi riset maksimal ~8 halaman agar cepat. Jika browser gagal, lanjutkan dari pengetahuan
  sendiri dan tandai klaim "(perlu verifikasi)".
- Bahasa dokumen: **Bahasa Indonesia** (istilah teknis boleh Inggris).

## Tujuan proyek
Membedah scope, lalu menentukan apa yang **DITAMBAH**, **DIUBAH/DIGABUNG**, dan **DIKURANGI/DIHAPUS**
agar produk relevan untuk 2026, lalu menghasilkan **workflow yang jelas** dan **wireframe yang jelas**.

## Aturan kerja worker
1. Kerjakan HANYA scope task kamu. Jangan edit file worker lain. Jangan ubah `note.md`.
2. Tulis output ke path yang ditentukan di spec task kamu.
3. Setiap rekomendasi wajib punya: **alasan**, **dampak ke user**, **prioritas (P0/P1/P2)**,
   **effort kasar (S/M/L)**.
4. Bedakan jelas: [KEEP] [MODIFY] [MERGE] [REMOVE] [ADD-AI] [ADD].
5. Jangan mengarang klaim fakta tentang produk pihak ketiga tanpa sumber; jika tidak yakin, tandai "(perlu verifikasi)".
6. Jika ada pertanyaan yang memblokir, gunakan `orca orchestration ask`; selain itu ambil asumsi wajar dan catat di bagian "Asumsi".
7. Selesai = file output ditulis + kirim `worker_done` (outcome succeeded) dengan `--report-path` ke file output kamu dan body ringkasan 5–10 baris.

## Struktur folder
- `analysis/`   → laporan analis (fase 1)
- `reviews/`    → laporan reviewer (fase 2 & 4)
- `orchestration/DECISIONS.md` → keputusan orkestrator (fase 3, ditulis orkestrator)
- `deliverables/` → workflow & wireframe (fase 3)
