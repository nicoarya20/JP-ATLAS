# Debug di iOS Simulator — cara pakai

Tujuan: memperbaiki app mobile tanpa bolak-balik ke HP. User cukup klik app di jendela Simulator di Mac, sedangkan Claude membaca log Metro dan screenshot layar sendiri, tanpa user menyalin log.

**Kenapa Simulator, bukan Jest atau Expo web:** crash tab bar (commit `a27fd21`) hanya muncul di runtime iOS sungguhan. Jest menjalankan worklet sebagai JS biasa, dan di Expo web gesture handler, Reanimated, dan Liquid Glass berbeda dari native. Simulator memakai Hermes dan UI runtime Reanimated yang sama dengan HP.

## Prasyarat (sekali saja)

Terpasang per 26 Okt 2026: macOS 26.7.1, Xcode 27.1, runtime Simulator iOS 27.0 (sekitar 7,5 GB). Cukup satu runtime: iOS 27.0 memuat semua iPhone, termasuk iPhone 18 Pro. Runtime iOS 27.1 (build `24A94425`) hanya untuk iPhone Duo, jadi sudah dihapus untuk menghemat 7,3 GB. Unduh lagi lewat Xcode → Settings → Components bila perlu tes layar lipat.

1. Pasang **Xcode** dari App Store (minimal macOS 26.6). Buka sekali, lalu centang platform **iOS** agar runtime Simulator ikut terunduh.
2. Arahkan developer tools ke Xcode:
   ```
   sudo xcode-select -s /Applications/Xcode.app && xcodebuild -runFirstLaunch
   ```
3. Cek: `xcode-select -p` berakhir di `Xcode.app/Contents/Developer`, dan `xcrun simctl list devices available` menampilkan iPhone.

**Xcode 27 tidak lagi punya `Simulator.app`.** Jendela Simulator ada di `Xcode.app/Contents/Applications/DeviceHub.app`, jadi `open -a Simulator` gagal. Kalau jendelanya tidak muncul sendiri, buka DeviceHub.

## Menjalankan

Dari `mobile/`:

```
xcrun simctl bootstatus "iPhone 18 Pro" -b   # nyalakan bila mati, tunggu sampai siap
bun run ios:sim
```

Tunggu `bootstatus` selesai sebelum `ios:sim`. Kalau Simulator masih booting, Expo gagal membuka app (`simctl openurl` timeout, kode 60) lalu berhenti.

`ios:sim` menjalankan `expo start --ios` dan menyalin output Metro ke `.logs/metro.log` (di-ignore git). Pertama kali, Expo CLI mengunduh dan memasang Expo Go SDK 58 di Simulator sendiri. Bundle pertama butuh sekitar 40 detik.

Claude menjalankan perintah ini di background, lalu membaca `.logs/metro.log` untuk `console.log`, error JS, dan redbox.

### Mode produksi (`ios:sim:prod`)

`bun run ios:sim:prod` sama dengan `ios:sim`, tetapi bundle dibuat tanpa mode dev dan di-minify (`--no-dev --minify`): tanpa warning dan pemeriksaan dev React, sehingga rasanya mendekati rilis. Pakai untuk menilai performa dan tampilan akhir. Tidak ada redbox, LogBox, atau Fast Refresh, dan error JS hanya muncul ringkas di `.logs/metro.log`, jadi untuk debugging kembali ke `ios:sim`. Metro tetap berjalan karena app dimuat Expo Go; hentikan `ios:sim` dulu sebelum menjalankan ini (port 8081 sama).

## Alat Claude

| Kebutuhan | Perintah |
| --- | --- |
| Lihat layar | `xcrun simctl io booted screenshot .logs/sim.png` |
| Buka layar tertentu | `xcrun simctl openurl booted "exp://$(ipconfig getifaddr en0):8081/--/events"` (path expo-router setelah `/--/`) |
| Crash native | `xcrun simctl spawn booted log stream --style compact --predicate 'process == "Expo Go"'` |
| Matikan Simulator | `xcrun simctl shutdown all` (sekitar 1 GB RAM kembali; hentikan juga `ios:sim`) |

Deep link memakai skema `exp://` milik Expo Go, bukan `simplepm://`, karena app berjalan di dalam Expo Go. Skema `simplepm` baru berlaku di development build.

`simctl` tidak bisa menyentuh layar. Tap dan geser dijalankan Claude lewat Maestro (bagian berikut); user cukup mencoba rasa gestur di jendela Simulator bila perlu.

## Maestro (tap dan geser otomatis)

Terpasang per 26 Okt 2026: Maestro 2.11.0 dan `openjdk@21` lewat Homebrew. JDK dari Homebrew tidak didaftarkan ke macOS (`/usr/libexec/java_home` tidak menemukannya), jadi setiap perintah Maestro butuh `JAVA_HOME`:

```
export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home MAESTRO_CLI_NO_ANALYTICS=1
maestro --device <UDID> test .logs/maestro/regress.yaml   # UDID dari `xcrun simctl list devices booted`
maestro --device <UDID> hierarchy --compact                # testID dan label yang terlihat Maestro
```

- `appId` di flow adalah `host.exp.Exponent` (Expo Go). Buka layar dulu lewat deep link, tunggu bundle siap, baru jalankan flow.
- Pilih elemen lewat `id:` (= `testID`, mis. `tab-tasks`, `tab-more`, `create-fab`) atau label aksesibilitas. Label FAB berganti per tab ("Create" hanya di Home; Events = "New event").
- Geser pil: `swipe` dengan koordinat titik, mis. `start: 166, 794` → `end: 50, 794` (iPhone 18 Pro; ambil koordinat dari `hierarchy`).
- Flow disimpan di `.logs/maestro/` (lokal, di-ignore git). `regress.yaml` mengetuk tab, menggeser pil, membuka More, lalu membuka sheet Create.
- Setelah flow, cek `.logs/metro.log` dan crash report baru di `~/Library/Logs/DiagnosticReports/Expo Go-*.ips`. Error JS di worklet (UI thread) membuat app abort tanpa redbox, dan pesannya tidak masuk Metro. Untuk melihatnya, bungkus sementara pemanggilan di worklet dengan `try/catch` + `console.log`; log dari UI runtime masuk ke Metro.

## Yang tetap perlu HP

Haptics, rasa gestur di jari, dan performa nyata. Cek di HP cukup di akhir (lihat `phase1-device-qa.md`), tidak perlu tiap iterasi.
