# Fase 1 — Tab Bar & Navigasi Mobile

Status: diimplementasikan di Fase 1 (2026-10-25). Penyimpangan dari prototipe dan log: reacttransition.md §1 dan §8.

Spesifikasi porting tab bar dan navigasi prototipe ke React Native (Expo SDK 58). Ditulis Sesi A (A1) pada 2026-10-25, disetujui orchestrator `pm-dashboard-0d`. Kontrak umum ada di [`../reacttransition.md`](../reacttransition.md); dokumen ini hanya menyangkut tab bar, panel More, tombol "+", sheet Create, dan pohon route.

**Aturan dasar dari user: ikuti prototipe mobile 1:1.** Sumber kebenaran perilaku adalah `riset-keano/prototype-react/` beserta tesnya. Bila dokumen ini dan prototipe berbeda, prototipe yang benar; perbaiki dokumen ini.

## 1. Keputusan

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-10-25 | Tab bar **custom** lewat prop `tabBar` pada JS `Tabs` dari `expo-router/js-tabs` | NativeTabs tidak bisa membuat tombol "+" di samping pil, tidak bisa mencegat tap More, dan mengabaikan warna di iOS 26 (lihat §3) |
| 2026-10-25 | **Jangan** pakai `expo-router/ui` (headless tabs) | Docs Expo menandainya *experimental*; JS Tabs (React Navigation bottom-tabs yang di-vendor expo-router) stabil |
| 2026-10-25 | NativeTabs ditinggalkan di Fase 1 | Konsekuensi aturan 1:1 di atas |
| 2026-10-25 | **Tanpa** `expo-haptics` | Prototipe tidak punya haptic |
| 2026-10-25 | Sheet Create milik Sesi A, di `src/screens/create/` (bukan `src/screens/home/**`) | Menghindari bentrok dengan wilayah Sesi B |
| 2026-10-25 | Urutan kerja F1a → F1e (§6) | Fungsional dulu, lalu animasi, lalu kaca dan aksesibilitas |

## 2. Perilaku prototipe yang diport

Sumber: `src/kit/tabbar.jsx`, `src/kit/tabbar.css`, `src/kit/layout.jsx`, `src/core/PhoneApp.jsx`, `src/styles/app.css`, `src/styles/library.shell.css`, `src/styles/tokens.css`, `src/screens/home/home.more.jsx`, `src/screens/home/home.css`, `src/screens/home/home.create.jsx`, dan tes `src/test/tabbar.test.jsx`, `tabbar.bubble.test.jsx`, `tabbar.more.test.jsx`, `home.create.test.jsx` (semua di `riset-keano/prototype-react/`).

### 2.1 Tab

| id | Label (untuk screen reader) | Root | Ikon lucide (22 px) |
|---|---|---|---|
| `home` | Home | `home.main` | `House` |
| `tasks` | Tasks | `tasks.my` | `CircleCheck` |
| `projects` | Projects | `projects.list` | `FolderKanban` |
| `events` | Events | `events.list` | `CalendarDays` |
| `more` | More | — (membuka panel) | `Ellipsis` |

- Hanya ikon yang tampil; label tetap ada untuk aksesibilitas.
- Warna ikon: tab aktif = accent (violet `atlas`), lainnya = warna label. Transisi warna 200 ms ease.
- Bar dipasang **sekali** dan bertahan lintas layar (di prototipe di-host oleh `PhoneApp`), sehingga gelembung meluncur antar-tab dan bar tidak muncul ulang.
- Pindah tab me-reset riwayat tab itu (`go(root, { replace: true })`).

### 2.2 Pil kaca

- Floating: `left`/`right`/`bottom` = 16 (`--sp-4`), berjajar dengan FAB, gap 10, rata bawah (pil tumbuh ke atas menjadi panel).
- Tinggi 58, padding 4, radius penuh. Grid 5 kolom sama lebar.
- Ruang yang disisakan untuk konten di atas bar: `--tab-bar-space: 76px`, ditambah 16 (`--sp-4`) padding bawah konten.
- Kaca (`tokens.css`, mode terang):
  - `--glass-bar` = `--atlas-surface` 60% (pil dan FAB)
  - `--glass-bar-edge` = putih 0.7, garis 0.5 px
  - `--glass-bar-shine` = putih 0.8, highlight inset 1 px di atas
  - `--glass-bar-active` = `--atlas-control` 16% (gelembung)
  - `--glass-bar-shadow` = `--atlas-shadow`
  - `--glass-bar-open` = `--atlas-surface` 88% (saat panel terbuka di atas dim)
  - Blur 24 px, saturate 180%
- Mode gelap: edge putih 0.12, shine putih 0.1, open = surface 60% (sama dengan saat tertutup).
- Di RN tidak ada token `--glass-*` terpisah: `GlassSurface` memakai kelas token (`bg-card/60` tertutup, `bg-card/88` saat panel terbuka, `border-border`) tanpa blur, dan gelembung `bg-input/15` (§4.3). Komponen tab bar tanpa hex.

### 2.3 Gelembung (penanda tab aktif)

Gelembung = satu tab lebarnya, inset 4 dari tepi pil, radius penuh, warna `--glass-bar-active` dengan shine inset. Posisinya = indeks tab (pecahan saat diseret).

| Keadaan | Gerak | Durasi / easing |
|---|---|---|
| Tap atau ganti tab dari mana pun (termasuk link di layar) | Translate ke tab baru | 420 ms, spring `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| — sekaligus | Jelly: scale (x, y) `1.16,1.12` → 30% `1.22,0.86` → 55% `0.92,1.08` → 75% `1.04,0.97` → `1,1` | 600 ms ease-out |
| — ikon aktif | Pop: scale `0.85` → 60% `1.12` → `1` | 480 ms, spring yang sama |
| Jari turun (`is-held`) | Gelembung melompat ke bawah jari, terangkat: scale `1.16, 1.12`, bayangan `--glass-bar-shadow`; ikon aktif scale `1.12` | translate 240 ms spring, scale 260 ms spring, shadow 220 ms ease |
| Diseret (`is-dragging`) | Mengikuti jari | translate 90 ms ease-out |
| Lepas | Ke tab terdekat (`Math.round(pos)`), lalu jelly | seperti baris pertama |
| Lepas di tab yang sama | Tanpa navigasi, jelly di tempat (`onReselect`) | 600 ms |
| Cancel (pointercancel) | Kembali ke tab aktif | — |

- Posisi di-clamp `[0, n − 1]`. Rumus prototipe: `pos = clamp((x − left − PAD) / ((width − 2·PAD) / n) − 0.5, 0, n − 1)` dengan `PAD = 4`.
- Ikon yang menyala saat ditahan = `round(pos)`.
- Pantulan baru saat pantulan lama berjalan me-restart animasi (prototipe bergantian antara dua keyframe identik).
- Tidak ada pantulan pada mount pertama.
- Bar tersembunyi di layar tanpa tab (§2.6).
- Panah kiri/kanan berpindah tab (web). Padanan RN: aksi aksesibilitas "Next tab"/"Previous tab" (§4.4).

### 2.4 Tombol "+" (FAB)

- Bulat 60 × 60, material kaca sama dengan pil. Ikon `Plus` 26 px. Saat ditekan scale 0.94 (220 ms ease).
- Target per tab (`createFor(tab, role)` di `kit/layout.jsx`):

| Tab | Target | Label aksesibilitas |
|---|---|---|
| Tasks | `tasks.write` | New task |
| Projects | `projects.new` | New project |
| Events | `events.new` | New event |
| Home, More | sheet `home.create` | Create |

- Bila role tidak boleh membuka target (Member di Projects), `createFor` = `null`:
  - FAB terlipat: width 0, margin-left −10 (membatalkan gap), opacity 0, scale 0.6. Width/margin 380 ms `cubic-bezier(0.32, 0.72, 0, 1)`, opacity 160 ms, scale 260 ms.
  - Pil melebar mengisi ruang.
  - FAB tetap ter-mount (aria-hidden + inert) supaya bisa terlipat dan terbuka kembali, bukan muncul/hilang mendadak.
  - Saat terbuka lagi: opacity 220 ms dengan delay 120 ms, width/margin/scale 380 ms dengan easing yang sama.
- Menekan FAB menutup panel More dulu, lalu navigasi.

### 2.5 Panel More

- Menekan More **tidak** menavigasi. Pil tumbuh ke atas menjadi kartu berisi panel; radius shell 29.
- Animasi buka:
  - Tinggi 0 → tinggi konten, 480 ms `cubic-bezier(0.32, 0.72, 0, 1)`.
  - Swell sekali pada shell: scale `1,1` → 35% `1.03,0.98` → 65% `0.99,1.01` → `1,1`, 560 ms spring `cubic-bezier(0.34, 1.56, 0.64, 1)`, origin tengah bawah.
  - Anak panel (`tb-rise`, urutan `--i`) muncul berurutan dengan delay `90 + i × 28` ms: opacity 0 → 1 (240 ms ease), translateY 14 → 0 dan scale 0.88 → 1 (460 ms spring).
- Animasi tutup: tinggi 300 ms `cubic-bezier(0.4, 0, 0.2, 1)`, tanpa swell. Anak: opacity 120 ms, translate/scale 160 ms ease.
- Scrim di belakang: `--overlay` (`--atlas-veil`; gelap: hitam 0.6), blur 4 px, opacity 280 ms ease. Tap scrim = tutup.
- Selama panel terbuka, gelembung pindah ke More (`activeId = more`) dan pil/FAB memakai `--glass-bar-open`.
- Panel terlipat oleh: More lagi, tap scrim, Escape, tab lain (lipat lalu pindah ke tab itu), navigasi apa pun, atau memilih item. Bila tab di bawahnya dipilih lagi, panel hanya terlipat.
- Isi (`home.more.jsx`, `home.css`):
  - Kartu profil (`tb-rise`, `--i: 0`): avatar, nama lengkap, `title · division` (+ `· Admin` untuk Admin), chevron. Label aksesibilitas: `"<nama>, open profile"`. Membuka overlay `profile.me`. Radius 18, scale 0.98 saat ditekan.
  - Grid 3 kolom (gap 12/8) berisi ubin 58 × 58, radius 18, ikon 24 putih di kedua skema, scale 0.9 saat ditekan. **Di RN (sementara):** ubin lembut Atlas dengan ikon berwarna, karena glyph putih di ubin hijau/oranye/teal < 3:1; menunggu keputusan user (`reacttransition.md` §7). Ubin:
    - Inbox (biru, badge = jumlah `inbox.respond`; RN: `getProfile(role, decided).inbox`) → `inbox.respond`
    - Team (hijau) → `team.list`
    - Users (oranye, **khusus Admin**, badge = `users.counts.pending`; RN: `waitingUsers(decided).length` dari store keputusan `users.ts`) → `users.approve`
    - Archive (teal) → `archive.list`
    - Settings (abu) → `settings.main`
  - Badge: min 20 × 20, radius penuh, `--danger-fill` dengan teks `--on-accent`, ring 2 px warna surface. Label aksesibilitas ubin berbadge: `"<label>, <n> new"`.
- Pemilihan item: `close()` dulu, lalu `go(id)`.

### 2.6 Layar yang menampilkan tab bar

Bar tampil di layar yang memakai prop `tab`:

| Layar | `tab` |
|---|---|
| `home.main` | home |
| `tasks.my` (tasks.list) | tasks |
| `projects.list`, `projects.detail` | projects |
| `events.list` | events |
| `inbox.respond` (inbox.parts), `team.list`, `team.person`, `archive.list`, `users.*` (users.parts) | more |

Layar lain (detail tugas, form, flow modal) tidak menampilkan bar. Jadi tiap tab punya stack bersarang, dan sebagian layar detail tetap memperlihatkan bar. Di RN, sheet (`SHEET`) di atas layar ber-bar (filter, extend/archive proyek, task-filter, delete Archive) tetap menggambar bar di bawahnya (§4.1).

### 2.7 Sheet Create

- Bentuk: overlay setinggi konten (`FullSheet fit`), bukan bottom sheet pustaka. Ditutup lewat X kiri atas, swipe-down, tap dim, atau Escape.
- Judul "Create", sub "What do you want to add?".
- Baris (`home.create.jsx`). Baris yang tidak boleh dibuka role disembunyikan:

| Target | Judul | Sub |
|---|---|---|
| `tasks.write` | Task | Just write it or fill a form |
| `projects.new` | Project | From a story, a template or a form |
| `events.new` | Event | Meeting, review or team event |
| `tasks.csv` | Import tasks | Add many tasks from a CSV file |
| `settings.leave` | `LEAVE[role].title` | Days you will be away |

- Ikon baris 18 px dalam ubin bernada (blue, green, orange, gray, gray). Member tidak melihat Project. RN memakai ubin lembut Atlas seperti panel More (§2.5).
- Memilih baris menutup sheet, lalu membuka target. RN: `router.replace(createHref(go))`, sheet diganti target, sehingga menutup target kembali ke tempat "+" ditekan.

### 2.8 Reduced motion (`prefers-reduced-motion`)

- Tanpa swell, jelly, dan pop.
- Gelembung: translate 120 ms ease, scale tetap 1.
- Anak panel: hanya opacity 120 ms, tanpa translate/scale.
- FAB: hanya opacity 120 ms, scale tetap 1.

## 3. Kenapa bukan NativeTabs

Diverifikasi di docs Expo dan types SDK 58 terpasang (`expo-router` 58.0.26):

- Tampilan "constrained to the native platform behavior": kustomisasi per item hanya Icon/Label/Badge. Di iOS 26, Liquid Glass mengabaikan `backgroundColor`, `blurEffect`, `shadowColor`, dan `disableTransparentOnScrollEdge`, sehingga token JP Atlas tidak bisa diterapkan ke bar.
- Tap tab tidak bisa dicegat untuk membuka panel. `disabled` (SDK 56+) hanya membatalkan pindah tab, tanpa callback.
- Tidak ada slot tombol di samping pil:
  - `BottomAccessory` muncul **di atas** bar.
  - `role="search"` adalah tab pencarian sistem yang hanya tampil terpisah di iOS 26.
- Tinggi bar tidak bisa diukur. Semua layar dirender eager. FlatList tidak mendukung minimize/scroll-to-top. Android maksimal 5 tab.

**Yang hilang dengan bar custom (diterima):** bar sistem iOS 26 asli (lensa seret native, minimize-on-scroll, Large Content Viewer, aksesibilitas otomatis) dan Material bottom nav di Android. **Yang didapat:** desain prototipe persis, perilaku sama di iOS dan Android, dan token JP Atlas.

## 4. Desain implementasi RN

### 4.1 Navigator

- `app/(tabs)/_layout.tsx`: `<Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, popToTopOnBlur: true }} screenLayout={…BehindMorePanel…}>`, satu `Tabs.Screen` per `TABS` (nama = `tab.route`), dibungkus `MorePanelProvider`; `SnackHost` dirender setelah `Tabs`.
  - `Tabs` dari `expo-router/js-tabs` (React Navigation bottom-tabs yang di-vendor expo-router).
  - `popToTopOnBlur` = padanan reset riwayat saat pindah tab.
- More **tanpa** listener `tabPress` di layout: `GlassTabBar` (`pick`) membuka/menutup panel untuk indeks More. Tab lain memancarkan `tabPress` (`canPreventDefault: true`) lalu `navigateToTab`; bila panel terbuka, tap tab mana pun melipat panel dulu, dan tab di bawah panel hanya melipat.
- State panel = `useMorePanel()` (`open`, `close`, `toggle`) di `MorePanelProvider`; dibaca dengan `useMore()`. Pathname baru melipat panel; `BackHandler` Android melipat panel selama terbuka.
- Bar custom di-render sekali oleh navigator di atas semua layar, sama dengan host di `PhoneApp`, sehingga gelembung bisa meluncur.
- Visibilitas bar: `useTabBarVisible()` membaca `useSegments()` lewat fungsi murni `tabBarVisibleFor(segments)` (`BAR_SCREENS` = allowlist §2.6, `BAR_SHEETS` = sheet di atas layar ber-bar). Route di luar `(tabs)` (sheet/modal root) → `null`, dan bar mempertahankan jawaban terakhir. Tidak ada `setOptions` per layar.
- Ruang konten: `useTabBarInset()` (`src/navigation/use-tab-bar-inset.ts`) = `TAB_BAR_SPACE` 76 + safe-area bawah (padanan `--tab-bar-space`), dipakai layar ber-tab dan `SnackHost`.
- Keyboard terbuka → bar disembunyikan (`useKeyboardShown()`; `keyboardWillShow/Hide` di iOS, `keyboardDidShow/Hide` di Android; `tabBarHideOnKeyboard` hanya berlaku untuk bar default).
- **Anchor:** root `unstable_settings = { anchor: '(tabs)' }` (sheet/modal yang dibuka lewat link tetap punya tab di bawahnya). Stack Tasks, Projects, Events memakai `anchor: 'index'`: back dari detail yang dibuka dari Home kembali ke list tab itu, bukan ke Home (penyimpangan, `reacttransition.md` §1). Stack Home dan More tanpa anchor; `more/index` hanya `<Redirect href="/" />`.

### 4.2 Gesture dan animasi

- **Gesture Handler 3.3** memakai API hook: satu `usePanGesture` di `use-bubble.ts` (`testID: 'tab-pan'`, `minDistance: 0`) dengan `onBegin`/`onActivate`/`onUpdate`/`onFinalize`.
  - begin = lompat ke jari (held), update = ikuti (dragging), finalize = pilih tab yang menyala (`lit`), bukan posisi gelembung yang mungkin masih meluncur.
  - Tap yang tidak bergerak tidak mengaktifkan pan tetapi tetap memilih. Pan yang dibatalkan sistem setelah aktif → `snapBack()` ke tab aktif.
  - Bila pilihan tidak menjadi tab aktif (`onPick` = false, mis. tekanan diambil alih), gelembung kembali tanpa pantulan.
- **Reanimated 4.7.1 + Worklets 0.13.0:**
  - Lebar, posisi, scale, lift, ikon, dan tab menyala disimpan sebagai shared value di UI thread (`BubbleValues`).
  - JS hanya dipanggil lewat `scheduleOnRN` (react-native-worklets): saat lepas (`release`) dan saat tab menyala berganti.
  - Keyframe CSS diganti helper `keyframes(frames, totalMs, easing)` di `tab-bar.motion.ts` (`withSequence` dari `withTiming` per interval, easing per interval seperti CSS).
  - Pantulan baru menggantikan animasi yang sedang berjalan karena shared value di-set ulang dari keyframe pertama.
  - Setiap pergantian tab aktif, dari mana pun, meluncurkan gelembung dengan jelly; tidak pada mount pertama.
- Reduced motion: `useReducedMotion()` (Reanimated) memilih varian §2.8.
- Konstanta durasi dan easing dikumpulkan di `tab-bar.motion.ts` (`SPRING`, `EASE`, `EASE_OUT`, `FAB_EASE`, `PANEL_CLOSE_EASE`, `FAB`, `PANEL`, `SWELL`, `BUBBLE_MS`, `HELD`, `JELLY`, `POP`). Nilainya dari §2, jangan diketik ulang di komponen.

### 4.3 Kaca

- Satu komponen `GlassSurface` (`radius`, `open?`, `hidden?`) untuk shell pil/panel dan FAB. Tidak memakai `GlassContainer`.
- `GlassView` dari `expo-glass-effect` hanya bila `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()` (iOS 26+, dan beberapa beta iOS 26 tidak punya API-nya, issue expo#40911) dan Reduce Transparency mati. `colorScheme` dari `useColorScheme()`.
- Tint di atas material: Liquid Glass hanya diberi `bg-card/88` saat panel terbuka; tanpa Liquid Glass `bg-card/60` (tertutup) / `bg-card/88` (terbuka). `expo-blur` tidak dipasang karena blur di Android mahal.
- Reduce Transparency (`useReduceTransparency()`, mengikuti `reduceTransparencyChanged`) → permukaan solid `bg-card`.
- Caveat docs: jangan menurunkan opacity `GlassView` atau parent-nya di bawah 1. FAB yang terlipat memberi `hidden`, sehingga `glassEffectStyle` menjadi `'none'` sebelum opacity wrapper turun.
- Gelembung = `Animated.View` berisi tint token (`bg-input/15`) dan lapisan bayangan yang opacity-nya naik saat ditahan, bukan `GlassView`, supaya ringan.

### 4.4 Aksesibilitas

- Pil: `View` biasa (tidak `accessible`) dengan `accessibilityRole="tablist"`, label "App navigation", supaya VoiceOver tetap membaca tiap tab.
- Item (`TabItem`): `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, `accessibilityLabel` = label tab. Item tidak menerima sentuhan sendiri (pan pil yang menerima).
- Aksi aksesibilitas per item (`TAB_ACTIONS`): `activate` (double-tap screen reader, jalur yang sama dengan lepas jari), `next` "Next tab", `previous` "Previous tab" (padanan panah kiri/kanan, berputar). **Bukan** `increment`/`decrement`, karena VoiceOver hanya menawarkannya pada elemen adjustable.
- Panel More:
  - Pembungkus bar `accessibilityViewIsModal` selama panel terbuka (iOS); layar tab di belakang dibungkus `BehindMorePanel` dengan `importantForAccessibility="no-hide-descendants"` (Android).
  - Panel = `role="group"` berlabel "More"; saat terlipat `accessibilityElementsHidden` + `no-hide-descendants` dan `pointerEvents="none"`.
  - Padanan Escape: `onAccessibilityEscape` pada shell (Z dua jari di iOS) dan `BackHandler` (tombol kembali Android).
  - Fokus aksesibilitas pindah ke kartu profil setelah panel terbuka (`AccessibilityInfo.sendAccessibilityEvent(host, 'focus')` setelah `PANEL.openMs`).
- Scrim: Pressable berlabel "Close More" (`TAB_SCRIM.close`).
- FAB terlipat: `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` + `pointerEvents="none"` (padanan `aria-hidden` + `inert`); label terakhirnya dipertahankan.
- Large Content Viewer tidak tersedia di bar custom. Ini konsekuensi yang diterima.
- **Wajib diuji di perangkat dengan VoiceOver dan TalkBack** (`docs/phase1-device-qa.md`).

### 4.5 Sheet dan modal

- Opsi bersama di `src/navigation/stack-presentation.ts`:
  - `SHEET` (per platform, `OWN_SHEET`):
    - **iOS:** `presentation: 'transparentModal'`, `animation: 'none'`, `gestureEnabled: false`, latar transparan. `SheetFrame` → `OwnSheet` (`src/components/sheet/own-sheet.tsx`, gerak di `use-own-sheet.ts`) menggambar dim + panel edge-to-edge (`rounded-t-modal`, grabber, X kiri atas, judul tetap; isi bergulir), slide-up saat dibuka, ikut seret ke bawah (lewat 30% tinggi panel atau flick > 900 pt/s = tutup), naik di atas keyboard. Tap dim, X, dan escape aksesibilitas menutup. Penghapusan route ditahan `usePreventRemove` sampai panel selesai turun, apa pun penyebabnya (X, `router.back()`, `router.replace()`). Alasan: iOS 26+ menggambar formSheet di bawah detent penuh sebagai kartu Liquid Glass yang melayang ±8 pt dari tepi kiri, kanan, dan bawah, dan react-native-screens 4.30 tak punya opsi untuk mematikannya, jadi isi sheet tampak terpotong.
    - **Android:** `presentation: 'formSheet'`, `sheetAllowedDetents: 'fitToContents'`, `sheetGrabberVisible: true`, `sheetCornerRadius: 16` (radius modal JP Atlas `lg`); sudah edge-to-edge. Swipe-down, tap dim, dan escape native; isi = `NativeSheetBody` (ScrollView sebagai root). transparentModal tidak dipakai di sini karena di stack tab ia tergambar di bawah tab bar.
  - `MODAL`: `presentation: 'modal'`.
  - `NO_SWIPE`: `gestureEnabled: false` (grup `(auth)`, rekaman event).
- Create (`app/create.tsx`) dan Leave (`app/leave.tsx`) = `SHEET` di root Stack.
- `tasks/new`, `tasks/csv`, `projects/new`, `events/new`, `profile` = `MODAL` di root Stack, dengan chevron bawah berlabel "Cancel" (BRIEF.md: layar modal).
- Semua Stack `headerShown: false`; back = header sendiri (`DetailHeader`: chevron berlabel "Back", atau "Cancel" di modal).
- `profile.me` = modal setinggi penuh (`app/profile/_layout.tsx`, `calendar` di-push di dalamnya).

## 5. Dependency

Semua terpasang dan cocok dengan SDK 58 (`bundledNativeModules.json` sdk-58):

| Paket | Versi | Dipakai untuk |
|---|---|---|
| `react-native-reanimated` | 4.7.1 | Gelembung, panel, FAB |
| `react-native-worklets` | 0.13.0 | `scheduleOnRN` |
| `react-native-gesture-handler` | 3.3.0 | Seret gelembung; `jest-utils` untuk tes |
| `expo-glass-effect` | 58.0.5 | Kaca iOS 26 |
| `react-native-screens` | 4.30.0 | transparentModal (sheet iOS)/formSheet (sheet Android)/modal |
| `react-native-svg` | 15.16.0 | Ikon lucide |
| `lucide-react-native` | ^1.61.0 | Ikon tab, sama dengan prototipe |

Tidak dipakai: `expo-haptics` (keputusan §1), `expo-blur`, `@gorhom/bottom-sheet` (diganti `OwnSheet` di iOS dan formSheet native di Android), `expo-router/ui`.

## 6. Pembagian file dan urutan kerja

### 6.1 Route (tipis, hanya merender layar)

```
app/
  _layout.tsx                 Stack root (anchor (tabs)): (tabs); (auth) NO_SWIPE; create, leave SHEET;
                              tasks/new, tasks/csv, projects/new, events/new, profile MODAL
  create.tsx                  → src/screens/create/create.screen.tsx
  (tabs)/_layout.tsx          js-tabs Tabs + GlassTabBar + MorePanelProvider/BehindMorePanel + SnackHost
  (tabs)/(home)/_layout.tsx   Stack; index
  (tabs)/tasks/_layout.tsx    Stack (anchor index); index, filter, [id]/index|edit|return|cancel
  (tabs)/projects/_layout.tsx Stack (anchor index); index, filter, [id]/index|edit|settings|extend|archive|task-filter
  (tabs)/events/_layout.tsx   Stack (anchor index); index, filter, [id]/index|results|record|recording|outcomes/[step]|cancel|archive
  (tabs)/more/_layout.tsx     Stack; index (Redirect ke "/"), inbox, team/index, team/[id], archive/index,
                              archive/[key]/delete, users, settings/index, settings/profile
```

Presentasi tiap route (SHEET/MODAL/NO_SWIPE) dan route milik modul layar: `phase1-screens.md` §3. Semua route bertipe (typed routes Expo Router); helper `routeHref` (`src/navigation/route-href.ts`) sudah dihapus (R1), jadi jangan dipakai lagi.

### 6.2 Logika murni (`src/navigation/`)

| Berkas | Isi |
|---|---|
| `tabs.config.ts` | `TabId`, `TabDef` {id, label, route, root, Icon}, `TABS`, `MORE_ID`, `tabOfRoute(route)` |
| `tab-create.ts` | `CreateTarget` {go, label}, `CREATE`, `CREATE_MENU`, `createFor(tab, role)` (port 1:1 dari `kit/layout.jsx`) |
| `create-href.ts` | `CREATE_ROUTES` (id layar prototipe → route), `CreateGo`, `createHref(go)` |
| `tab-bar.visibility.ts` | `tabBarVisibleFor(segments)` → `boolean \| null` (`BAR_SCREENS` §2.6 + `BAR_SHEETS`) |
| `bubble.math.ts` | `BUBBLE_PAD`, `clamp`, `posAt(x, width, n, fallback, pad?)`, `nearest(pos)`; fungsi `'worklet'`, clamp sama dengan prototipe |
| `stack-presentation.ts` | `SHEET`, `MODAL`, `NO_SWIPE` (§4.5) |
| `screen-roles.ts` | `SCREEN_IDS`, `ScreenId`, `allowedScreen(id, role)` (W0, `phase1-screens.md` §3.3) |
| `use-tab-bar-inset.ts` | `TAB_BAR_SPACE`, `useTabBarInset()` (hook, satu-satunya berkas ber-React di sini) |

### 6.3 Komponen (`src/components/tab-bar/`, masing-masing ≤ 165 baris)

| Berkas | Isi |
|---|---|
| `glass-tab-bar.tsx` | `GlassTabBar`: komposisi; menerima `BottomTabBarProps`; `pick` (More, lipat, `tabPress`) |
| `glass-pill.tsx` | `GlassPill`: tablist + gesture pan |
| `tab-item.tsx` | `TabItem`, `TAB_ACTIONS`: ikon, label screen reader, aksi activate/next/previous |
| `use-bubble.ts` | `useBubble`, `BubbleValues`: shared value, pan, `release`, `snapBack` |
| `tab-bubble.tsx` | `TabBubble`: gelembung (held, dragging, jelly) |
| `create-fab.tsx` | `CreateFab`: FAB + lipat; `router.push(createHref(go))` |
| `tab-panel.tsx` | `TabShell` (lipat, swell, panel ter-mount terus), `usePanel()` |
| `panel-rise.tsx` | `PanelRise`: stagger anak panel |
| `tab-scrim.tsx` | `TabScrim`, `TAB_SCRIM`: dim + tap tutup |
| `more-panel.context.tsx` | `MorePanelProvider`, `useMore()`, `BehindMorePanel` |
| `use-more-panel.ts` | `useMorePanel()`: open/close/toggle, lipat saat pathname berganti, `BackHandler` |
| `use-tab-bar-visible.ts` | `useTabBarVisible()` |
| `use-keyboard-shown.ts` | `useKeyboardShown()` |
| `use-reduce-transparency.ts` | `useReduceTransparency()` |
| `glass-surface.tsx` | `GlassSurface`: `GlassView` atau tint token; peka reduce-transparency |
| `tab-bar.motion.ts` | Konstanta durasi/easing §2, varian reduced motion, `keyframes()` |

### 6.4 Layar

- `src/screens/more/more-panel.tsx` (`MorePanel`) + `more.tiles.ts` (`MORE_PANEL`, `moreTiles(role, decided?)`, `tileLabel`, `PROFILE_PATH`): isi panel, role-gated; tujuan = route `/more/*` dan `/profile`.
- `src/screens/create/create.screen.tsx` (`CreateScreen`) + `create.options.ts` (`CREATE_SHEET`, `createOptions(role)`): sheet Create.

### 6.5 Tes (jest-expo + React Native Testing Library)

- **Unit** (`__tests__/navigation/`): `bubble.math`, `tab-create`, `tab-bar.visibility`, `tabs.config`, `screen-roles`, `use-tab-bar-inset`.
- **Komponen/router** (`__tests__/navigation/`; route dengan `renderRouter` dari `expo-router/testing-library` lewat helper `openApp` di `__tests__/helpers/app-router.tsx`, yang memuat seluruh pohon route):
  - `tab-bar.bubble.test.tsx` (`GlassPill` langsung): tap, reselect, seret, clamp, snap back, aksi `activate`, reduced motion; pan dikendalikan `createGestureController('tab-pan')` dari `react-native-gesture-handler/jest-utils`.
  - `tab-bar.create.test.tsx`: FAB terlipat untuk Member di Projects dan kembali di Tasks; sheet Create per role, X, `replace` ke target. `create-fab.test.tsx`: animasi lipat/buka dan reduced motion.
  - `tab-bar.more.test.tsx`: panel tanpa ganti pathname, TalkBack, fokus kartu profil, lipat (More, dim, escape, back, tab lain, "+"), Users khusus Admin + badge yang turun. `tab-panel.test.tsx`: tinggi, swell, stagger, reduced motion.
  - `glass-surface.test.tsx`: Liquid Glass, fallback 60/88%, `hidden`, reduce transparency.
- `__tests__/tabs.test.tsx` (T5) ditulis ulang untuk JS Tabs: lima tab, pindah tab, `/more` → Home, More tetap terpilih di layar `/more/*`, `popToTopOnBlur`, anchor list di bawah detail, visibilitas bar, keyboard menyembunyikan bar.
- **Setup jest:** `setupFiles` = `react-native-gesture-handler/jestSetup.js` lalu `jest.setup.js` (berisi `setUpTests()` Reanimated); `setupFilesAfterEnv` = `jest.setup-after-env.js`.
- **Mitigasi sementara tes flaky** (akar: CPU oversubscription saat beberapa suite jalan bersamaan; diagnosis di `reacttransition.md` §8, entri H1): `maxWorkers: '50%'` dan `testTimeout` 15 s di `jest.config.js`, `asyncUtilTimeout` 3 s di `jest.setup-after-env.js`. Hapus setelah suite tidak lagi dijalankan bersamaan di satu mesin.

### 6.6 Urutan

Semua tahap selesai (✅ di `reacttransition.md` §6b); tabel ini dipertahankan sebagai catatan rencana.

| Tahap | Isi | Selesai bila |
|---|---|---|
| F1a | Pohon route §6.1, JS Tabs + bar polos (ikon, selected, tap), modul murni §6.2, tes unit, tes T5 ditulis ulang | Fungsional tanpa animasi; tes lulus |
| F1b | Gelembung + gesture + tes bubble | Seret/tap/reselect sesuai §2.3 di tes |
| F1c | FAB + sheet Create + tes | §2.4 dan §2.7 di tes |
| F1d | Panel More + tes | §2.5 di tes |
| F1e | Kaca §4.3, reduced motion, aksesibilitas §4.4; QA di Expo Go pada iOS 26 dan Android, termasuk VoiceOver/TalkBack | Dicek user di HP (`docs/phase1-device-qa.md`) |

## 7. Sumber

- docs.expo.dev/router/advanced/native-tabs — batasan NativeTabs; import `expo-router/native-tabs` mulai SDK 58.
- docs.expo.dev/router/advanced/custom-tabs — `expo-router/ui` berlabel *experimental*.
- docs.expo.dev/versions/v58.0.0/sdk/glass-effect — `GlassView`, `GlassContainer`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable`, caveat opacity, reduce transparency.
- `expo/expo` branch `sdk-58`, `packages/expo/bundledNativeModules.json` — versi paket SDK 58.
- Types terpasang di `mobile/node_modules`:
  - `expo-router` 58.0.26: `build/native-tabs/*`, `build/react-navigation/bottom-tabs/types.d.ts` (`tabBar`, `tabPress` canPreventDefault, `popToTopOnBlur`), `build/ui/*`
  - `react-native-gesture-handler` 3.3.0: `lib/typescript/v3` (hooks), `jestUtils`
  - `react-native-reanimated` 4.7.1: `useReducedMotion`, `setUpTests`, `withReanimatedTimer`, CSS `cubicBezier`
  - `react-native-worklets` 0.13.0: `scheduleOnRN`
  - `react-native-screens` 4.30.0: `sheetAllowedDetents: 'fitToContents'`, `sheetCornerRadius`, `sheetGrabberVisible`
- Prototipe: berkas yang disebut di awal §2.
