# Override dependensi (`package.json` → `overrides`)

Dicatat 15 Oktober 2026 (S0.0-05). `overrides` memaksa versi paket transitif yang tidak bisa dinaikkan lewat `bun update` karena induknya (Express di dalam `@modelcontextprotocol/sdk`) masih menyebut rentang lama. Diverifikasi didukung Bun 1.4.2: `bun install` menulis blok `overrides` ke `bun.lock` dan `bun audit` memakainya.

| Paket | Override | Kenapa | Advisori | Kapan dihapus |
|---|---|---|---|---|
| `proxy-addr` | `^2.0.8` | `express` 5.2.1 (dari MCP SDK) mengunci `proxy-addr` 2.0.7 yang rentan spoofing IP lewat IPv4-mapped IPv6 (critical). | `GHSA-jqcg-44mw-7w3h` | Saat MCP SDK menarik `express` ≥ 5.3.0 (sudah `proxy-addr ^2.0.8`). |
| `fast-uri` | `^3.1.8` | `ajv` di MCP SDK menarik `fast-uri` 3.1.7 (normalisasi host tidak konsisten, moderate). Tetap di 3.x; 4.x adalah lompatan mayor. | `GHSA-hrr3-gc8f-f4qj` | Saat `ajv` menaikkan batas bawah `fast-uri`. |
| `ip-address` | `^10.7.1` | `express-rate-limit` menarik `ip-address` 10.7.0 (perbandingan subnet lintas keluarga alamat dan diagnostik tanpa batas, moderate). | `GHSA-j6r3-76f7-8jcv`, `GHSA-h3mg-xc3c-68pw` | Saat `express-rate-limit` menaikkan batas bawah `ip-address`. |

Tanpa override (cukup `bun update @modelcontextprotocol/sdk vite`): MCP SDK 1.30.0 → 1.32.1 (`GHSA-6qxp-vccf-f47h`) dan `source-map-js` 1.2.1 → 1.2.2 lewat `vite` 8.3.4 → `postcss` 8.5.30 (`GHSA-68fv-2mgg-jv7q`).

Sisa temuan yang sengaja dibiarkan: `esbuild` ≤ 0.24.2 (moderate, `GHSA-67mh-4wv8-2f99`), salinan 0.18.20 bersarang dari `drizzle-kit`. Hanya alat dev, tidak ikut dimuat di runtime; dihapus saat `drizzle-kit` melepas `@esbuild-kit`.

Cek ulang berkala: hapus override yang induknya sudah memenuhi batas, lalu `bun install` dan `bun audit`.
