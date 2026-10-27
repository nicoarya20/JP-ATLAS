# Pola UI web — prop Mantine dulu, `style` kalau tidak ada propnya

Bacaan wajib sebelum menyentuh `app/**`. Ditetapkan di Gelombang 0 (27 Okt 2026) supaya tiga
pekerja area (`/app`, `/dashboard`, `/dev`+login) menulis bentuk yang sama.

Dokumen ini **tidak** mendefinisikan desain. Warna, skala tipografi, dan radius berasal dari paket
handoff JP Atlas dan dijaga `tests/theme-{contrast,design-system,scale}.test.ts`. Yang diatur di
sini cuma satu hal: **lewat jalan mana nilai itu sampai ke elemen.**

---

## 1. Aturan pokok

> Kalau Mantine punya prop untuk properti CSS itu, pakai prop. Kalau tidak ada, `style` boleh —
> **dengan komentar kenapa.**

Alasannya bukan selera:

- Prop jarak (`p`, `gap`, `mt`, …) membaca skala tema, jadi nilainya tidak bisa menyimpang dari
  8/12/16/24/32. `style={{ padding: 14 }}` bisa.
- Prop ukuran (`w`, `miw`, `fz`, …) melewati `rem()` Mantine, yang ikut `var(--mantine-scale)`.
  Skala teks pengguna (1 / 1,25 / 1,5) jadi bekerja sendiri. Angka piksel di `style` **tidak ikut
  diskala** — itu sebabnya `tests/ui/app-scale-safety.test.ts` memblokirnya.
- Prop warna (`c`, `bg`) menerima nama palet peran. `style={{ color: '#5146c9' }}` memotong tema,
  jadi mode gelap tidak ikut berubah.

---

## 2. Tabel konversi

Mantine 9 punya 54 style prop. Yang sering dibutuhkan di repo ini:

| `style` lama | Prop Mantine | Catatan |
|---|---|---|
| `minWidth: 0` | `miw={0}` | **166 pemakaian** — konversi terbanyak |
| `flex: '1 1 260px'` | `flex="1 1 260px"` | string CSS apa adanya |
| `width`, `height` | `w`, `h` | `maw`/`mah` untuk batas atas |
| `padding`, `margin`, `marginTop` | `p`, `m`, `mt` | nilai: token `"md"`, bukan angka |
| `background` | `bg` | nama palet: `bg="ok.1"` |
| `color` | `c` | `c="dimmed"`, `c="danger"` |
| `fontSize`, `fontWeight` | `fz`, `fw` | jangan px — `fz="sm"` |
| `textAlign`, `lineHeight` | `ta`, `lh` | |
| `borderRadius` | `radius` (komponen) / `bdrs` | utamakan `radius` |
| `border`, `borderColor` | `bd` | `bd="2px solid var(--mantine-color-ok-5)"` |
| `position`, `top`/`left`/`inset` | `pos`, `top`/`left`/`inset` | |
| `display` | `display` | |
| `opacity` | `opacity` | |
| `alignItems`, `justifyContent` | `align`, `justify` di `Group`/`Stack` | bukan style prop — ganti wadahnya |
| `gap` | `gap` di `Group`/`Stack` | |

### Pembungkus

| Lama | Baru |
|---|---|
| `<div>` | `<Box>` |
| `<div>` berisi anak bertumpuk | `<Stack gap="…">` |
| `<div>` berisi anak sebaris | `<Group gap="…">` |
| `<span>` di dalam teks | hapus saja, atau `<Text component="span">` |

`<div>`/`<span>` di dalam komponen Mantine yang merender `<a>` atau label: pakai
`<Group component="span">`, supaya tidak ada elemen blok di dalam elemen inline.

---

## 3. Kapan `style` masih sah

Mantine **tidak** punya prop untuk properti di bawah ini. Pakai `style`, dan tulis komentar satu
baris yang menjelaskan kenapa — bukan mengulang apa yang sudah terbaca dari kodenya.

| Properti | Kenapa tidak ada propnya |
|---|---|
| `overflow`, `overflowX`, `overflowY` | tidak ada di 54 style prop |
| `flexShrink`, `alignSelf` | tidak ada; `flex="0 0 auto"` sering bisa menggantikan `flexShrink: 0` |
| `whiteSpace`, `wordBreak`, `overflowWrap` | tidak ada — **tapi baca catatan di bawah** |
| `cursor` | tidak ada |
| `zIndex`, `transform`, `transition` | tidak ada |
| `gridTemplateColumns` dan kerabat grid | pakai `SimpleGrid`/`Grid` dulu; `style` kalau polanya tidak terwakili |

Contoh yang benar, dari `app/components/ui/ResponsiveTable.tsx`:

```tsx
{/* Mantine has no `overflow` style prop, so this stays a `style`: the table scrolls
    sideways rather than widening the page (CLAUDE.md mobile §2). */}
<Box style={{ overflowX: 'auto' }} visibleFrom="sm">
```

### Catatan: teks panjang biasanya bukan kasus `style`

Ada 98 `style` di repo ini yang berisi `overflowWrap`/`whiteSpace`/`wordBreak`, dan sebagian besar
sebenarnya mau "potong teks yang kepanjangan". `Text` Mantine sudah punya propnya:

```tsx
<Text truncate>{path}</Text>          {/* satu baris, diakhiri … */}
<Text lineClamp={2}>{description}</Text>  {/* potong setelah 2 baris */}
```

Pakai itu dulu. `style={{ wordBreak: 'break-all' }}` hanya untuk string tanpa spasi yang memang
harus dipaksa putus (token, hash, URL panjang).

---

## 4. Nama token yang harus dipakai

Sumber tunggalnya `app/lib/theme-tokens.ts`. **Jangan tulis hex di komponen.**

### Jarak — `SPACING`

| Token | px | Dipakai untuk |
|---|---|---|
| `"xs"` | 8 | antar kontrol sebaris |
| `"sm"` | 12 | antar baris di dalam kartu |
| `"md"` | 16 | padding kartu, antar kartu |
| `"lg"` | 24 | padding kartu lega (`p={{ base: 'md', md: 'lg' }}`) |
| `"xl"` | 32 | pemisah bagian besar |

Skala penuhnya 4/8/12/16/24/32/48/64; Mantine hanya menamai lima yang di tengah. Langkah 4 px
tidak punya nama, jadi ditulis angka: **`gap={4}`**. `gap={0}` juga sah (merapatkan sengaja).

**Angka lain dilarang.** Repo ini masih punya **103 `gap`** di luar skala — 44× `gap={2}`,
54× `gap={6}`, dan `gap={3}`/`gap={20}` masing-masing satu. Kalau kamu menyentuh baris seperti itu,
bulatkan ke `0`, `4`, atau token. Kalau 2 px memang disengaja, tulis komentar kenapa.

### Radius — `RADIUS`

| Token | px | Untuk |
|---|---|---|
| default | 10 | semua kontrol (tombol, input) — **tidak perlu ditulis** |
| `"md"` | 14 | kartu |
| `"lg"` | 16 | modal, drawer |
| `"xl"` | 20 | permukaan identitas, avatar |

`Paper`, `Card`, `Modal`, dan `Drawer` **sudah** mendapat radius yang benar dari
`app/lib/theme-components.ts`. Jadi `radius="md"` pada `Paper`/`Card` itu mubazir: ada
**112 pemakaian** yang bisa dihapus tanpa mengubah tampilan sama sekali. Hapus kalau lewat.

Hati-hati: `radius="md"` pada komponen **lain** (`ThemeIcon`, `Image`, `Avatar`, `Skeleton`)
**bukan** mubazir — default mereka 10 px, bukan 14. Menghapusnya mengubah tampilan.

### Warna

Nama peran: `atlas` (interaksi), `ok`, `warn`, `danger`, `gray`. Nama lama (`blue`, `indigo`,
`violet`, `teal`, `green`, `orange`, `yellow`, `red`) di-alias ke palet peran di
`app/lib/theme-palette.ts`, jadi `color="red"` tetap benar — tapi **kode baru pakai nama peran.**

Lime (`--jp-primary`) adalah aksi utama dan sudah otomatis terpasang pada `Button` terisi tanpa
prop `color`. Jangan pasang lime sendiri, jangan pakai lime untuk teks kecil atau penanda sukses.

### Default tema yang sudah ada — jangan ditulis ulang

Dari `app/lib/theme-components.ts`:

- `Button` dan semua input: `size="lg"` (50 px)
- `ActionIcon`: `size="xl"` (44 px)
- `Paper`/`Card`: `radius` 14 px **dan `withBorder`** — kartu berbingkai itu default. Yang sengaja
  tanpa bingkai menulis `withBorder={false}`.
- `Badge`: `size="lg"`, teks 16 px
- `Modal`/`Drawer`: radius 16 px + overlay navy

Menulis `size="lg"` pada `Button` di `/app` cuma kebisingan. Sebaliknya, tabel padat di `/dev` dan
`/dashboard` **boleh** `size="sm"` — itu pengecualian yang disengaja (CLAUDE.md mobile §5).

---

## 5. Sebelum / sesudah dari kode nyata

### `app/components/ui/PageHeader.tsx` — pembungkus dan gap

```tsx
// SEBELUM
<div>
  <Anchor component={Link} to={back.to} size="sm" mb="xs" display="inline-flex"
    style={{ alignItems: 'center', gap: 'var(--mantine-spacing-xs)' }}>
    <FiArrowLeft size="1.25em" aria-hidden />
    {back.label}
  </Anchor>
  <Group justify="space-between" align="flex-start" wrap="wrap">
    <div style={{ minWidth: 0 }}>

// SESUDAH
<Box>
  <Anchor component={Link} to={back.to} size="sm" mb="xs" display="inline-block">
    {/* A Group carries the icon/label gap, so it comes off the spacing scale instead of a style. */}
    <Group component="span" gap="xs">
      <FiArrowLeft size="1.25em" aria-hidden />
      {back.label}
    </Group>
  </Anchor>
  <Group justify="space-between" align="flex-start" wrap="wrap">
    {/* `miw={0}` lets a long title shrink and ellipsise rather than widen the row. */}
    <Box miw={0}>
```

Perhatikan: `alignItems: center` hilang karena `Group` memang sudah menengahkan anaknya. Sering
sebuah `style` lenyap begitu wadahnya diganti ke `Group`/`Stack` yang tepat.

### `app/components/settings/SettingsParts.tsx` — `flex` dan `minWidth`

```tsx
// SEBELUM
<Stack gap={2} style={{ flex: '1 1 260px', minWidth: 0 }}>
...
<div style={{ flex: '0 1 auto' }}>{control}</div>

// SESUDAH
{/* Grows past its 260 px basis but may shrink below it; `miw={0}` lets long text wrap
    instead of pushing the control off a 375 px screen. */}
<Stack gap={LABEL_GAP} flex="1 1 260px" miw={0}>
...
{/* Takes its natural width and never grows, so the label column gets the leftover space. */}
<Box flex="0 1 auto">{control}</Box>
```

`gap={2}` → `gap={LABEL_GAP}` (= 4), karena 2 px tidak ada di skala.

### `app/components/ui/SectionCard.tsx` — bingkai aksen dan prop bertipe

```tsx
// SEBELUM
accent?: string;
<Paper withBorder p="md" radius="md"
  style={accent ? { borderColor: `var(--mantine-color-${accent}-5)`, borderWidth: 2 } : undefined}>

// SESUDAH
export type AccentColor = 'ok' | 'warn' | 'danger' | 'atlas';
const ACCENT_BORDER_WIDTH = 2;
<Paper withBorder p="md"
  // `bd` keeps the accent on the palette token; radius comes from the Paper theme default (14 px).
  bd={accent ? `${ACCENT_BORDER_WIDTH}px solid var(--mantine-color-${accent}-5)` : undefined}>
```

Dua hal sekaligus: `style` → `bd`, dan `accent?: string` → union. Yang kedua membuat warna di luar
design system **gagal typecheck**, bukan diam-diam tidak merender bingkai.

### `app/components/ui/ViewToggle.tsx` — `<span>` yang tidak perlu

```tsx
// SEBELUM
<Center style={{ gap: 'var(--mantine-spacing-xs)' }}>
  <Icon size="1.25em" aria-hidden />
  <span>{label}</span>
</Center>

// SESUDAH
<Group component="span" gap="xs" justify="center">
  <Icon size="1.25em" aria-hidden />
  {label}
</Group>
```

---

## 6. Yang DILARANG diubah

- **Nilai desain.** Hex, ukuran font, radius, peran warna. Kalau menurutmu sebuah nilai salah,
  **laporkan**, jangan ubah. Tiga tes tema harus tetap lulus tanpa disentuh.
- **`mobile/**`.** Punya tema sendiri (`mobile/src/theme/*` + `bun run theme:css`).
- **Perilaku.** Pekerjaan ini tampilan: tidak ada rute baru, tidak ada perubahan data, tidak ada
  tombol yang hilang atau bertambah.
- **Melemahkan tes.** Kalau sebuah tes bergantung pada markup yang kamu ubah, perbarui tesnya
  supaya menjaga **jaminan yang sama** dalam bentuk baru — jangan hapus assertion-nya. Contoh:
  `app-scale-safety.test.ts` mencari `minWidth: 0` di sekitar `wrap="nowrap"`; kalau kamu
  mengubahnya jadi `miw={0}`, tambahkan `miw=\{0\}` ke regex itu, jangan turunkan ambangnya.

---

## 7. Checklist sebelum commit

1. `bun run typecheck` — nol error.
2. `bun test tests/ui/ tests/ui-components.test.tsx tests/theme-contrast.test.ts tests/theme-design-system.test.ts tests/theme-scale.test.ts` — hijau.
3. Setiap `style` yang masih ada punya komentar kenapa.
4. Tidak ada hex di komponen; tidak ada jarak/radius di luar skala.
5. Bayangkan layar 375 px: tidak ada scroll horizontal, semua bisa di-tap.

### Angka awal per area (patokan 27 Okt 2026)

Total `style={{` di `app/**` turun dari **485 → 479**. Sisanya milik area:

| Area | `style={{` |
|---|---|
| `/app` (routes + komponen produk) | 191 |
| `/dev` + login | 196 |
| `/dashboard` | 19 |

Komponen bersama (`app/components/ui/**` + `SettingsParts.tsx`) sudah selesai: `style` **6 → 1**
(yang tersisa `overflowX`, yang memang tidak punya prop) dan `<div>`/`<span>` **6 → 0**.
Di seluruh `app/**`: `<div>` 77 → 72, `<span>` 26 → 24.

Target kamu bukan nol — target kamu: **setiap `style` yang tersisa adalah salah satu dari kasus di
bagian 3, dan punya komentar.**
