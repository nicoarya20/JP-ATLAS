/**
 * PM2 — Pola A: jalankan BINARY (`./simple-pm start`) dengan env dari envman.
 *
 * Prasyarat:
 *   bun run build:binary     # menghasilkan ./simple-pm (self-contained; SSR + client + migrations ter-embed)
 *
 * Env disuplai oleh envman (profil `simple-pm:desktop`). Var dari envman menang
 * atas `.env` di cwd, jadi set PORT & NODE_ENV di profil envman, bukan di sini:
 *   - PORT=4007
 *   - NODE_ENV=production   (binary akan memperingatkan + membuka detail error bila bukan production)
 *
 * Menjalankan:
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs simple-pm
 *   pm2 restart simple-pm   # setelah rebuild binary
 *   pm2 save                # agar bangkit lagi setelah reboot (butuh `pm2 startup` sekali)
 */
const path = require('node:path');

// Binary hasil `bun run build:binary` (host) ada di root project ini.
const BIN = path.join(__dirname, 'simple-pm');

module.exports = {
  apps: [
    {
      name: 'simple-pm',
      // Bungkus lewat envman; pakai path absolut agar lepas dari PATH daemon PM2.
      script: '/usr/local/bin/envman',
      args: ['-e', 'simple-pm:desktop', '--', BIN, 'start'],
      interpreter: 'none', // binary + envman, bukan node/bun
      exec_mode: 'fork', // cluster mode TIDAK didukung untuk binary Bun
      instances: 1,
      cwd: __dirname, // binary & .env di-resolve relatif ke sini
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      kill_timeout: 5000, // beri waktu server menutup koneksi sebelum SIGKILL
      // Port TIDAK di-set di sini — sumber tunggal env = profil envman (PORT=4007).
    },
  ],
};
