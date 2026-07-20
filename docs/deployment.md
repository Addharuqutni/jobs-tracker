# Deployment ke VPS (Linux)

Panduan setup scraper di VPS Linux. Scraper JobStreet memakai **Playwright
(via Python sidecar)** sebagai engine utama ketika `SCRAPER_ENGINE=hybrid`,
dan **Puppeteer (Node)** sebagai fallback ketika request HTTP biasa diblokir.

Kedua engine butuh browser terinstall di VPS. Panduan ini menjelaskan keduanya.

## 0. Pilih strategi browser

| Opsi | Engine | Binary | Bot detection JobStreet | Rekomendasi |
|------|--------|--------|-------------------------|-------------|
| A | Playwright (Python sidecar) | Chrome system (`channel="chrome"`) | Paling tahan | **Utama untuk JobStreet** |
| B | Puppeteer (Node fallback) | Chrome system | Cukup tahan | Fallback |
| C | Puppeteer (Node fallback) | `chrome-headless-shell` | Mudah terdeteksi | **Tidak disarankan untuk JobStreet** |

JobStreet dilindungi Cloudflare Bot Management. `chrome-headless-shell`
(binary ringan Puppeteer) sering dideteksi sebagai bot dan menampilkan
halaman "Just a moment..." alih-alih job cards. Karena itu:

- **Gunakan opsi A** (Playwright + Chrome system) untuk JobStreet.
- Jangan andalkan `chrome-headless-shell` untuk JobStreet.

## 1. Install dependencies sistem

### Debian/Ubuntu

```bash
# Node.js 20+ (jika belum)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.11+ dan venv (jika belum)
sudo apt-get install -y python3 python3-venv python3-pip

# Chrome stabil (dipakai Playwright channel="chrome" dan Puppeteer fallback)
sudo apt-get update
sudo apt-get install -y wget gnupg
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Shared libraries yang dibutuhkan Chromium headless
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 libatspi2.0-0
```

### CentOS/RHEL/Fedora

```bash
sudo dnf install -y google-chrome-stable || sudo dnf install -y chromium
```

## 2. Setup Python sidecar (engine utama untuk JobStreet)

```bash
# Buat virtualenv di VPS
python3 -m venv server/scraper/experiments/.venv

# Aktifkan dan install dependencies
source server/scraper/experiments/.venv/bin/activate
pip install -r server/scraper/experiments/requirements.txt

# Install browser Playwright ( Chromium default)
playwright install chromium
# Jika pakai channel="chrome" (sudah install google-chrome-stable), step ini opsional

deactivate
```

## 3. Konfigurasi environment

Edit `.env` di VPS. **Perhatikan path Python berbeda di Linux vs Windows:**

```bash
# Engine: hybrid = pakai Python sidecar (Playwright) untuk JobStreet
SCRAPER_ENGINE=hybrid
SCRAPER_PYTHON_TOOL=auto

# Path Python VENV — LINUX pakai bin/python, BUKAN Scripts/python.exe
PYTHON_EXECUTABLE=./server/scraper/experiments/.venv/bin/python

# Puppeteer fallback (dipakai jika Python sidecar gagal/skip).
# Set ke path Chrome system. Auto-detect juga mendukung path umum Linux.
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

Path Chrome umum yang terdeteksi otomatis (`puppeteer-pool.ts`):

- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/snap/bin/chromium`

## 4. Jalankan diagnostik

Sebelum menjalankan scraper, verifikasi environment Node/Puppeteer:

```bash
npm run diagnose
```

Script ini mengecek:
- Platform & Node version
- `PUPPETEER_EXECUTABLE_PATH` / `CHROME_PATH`
- Deteksi otomatis Chrome
- Shared libraries (`ldd`) — apakah ada library yang missing
- Tes launch Puppeteer

Untuk Python sidecar, tes manual:

```bash
source server/scraper/experiments/.venv/bin/activate
python server/scraper/experiments/playwright_runner.py \
  --source jobstreet --keyword "react developer" --pages 1 --runs 1
deactivate
```

Jika output JSON berisi jobs, sidecar siap. Jika error "No jobs found",
kemungkinan bot detection — lihat troubleshooting.

## 5. Jalankan dengan PM2

```bash
npm install -g pm2
npm ci --omit=dev

# Build frontend (jika perlu)
npm run build

# Start API server
pm2 start "npm run dev:api" --name jobs-api

# Start scraper (cron mode)
pm2 start "npm run dev:scraper" --name jobs-scraper

pm2 save
pm2 startup
```

Atau dengan ecosystem file `ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: 'jobs-api',
      script: 'tsx',
      args: 'server/api/src/index.ts',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'jobs-scraper',
      script: 'tsx',
      args: 'server/scraper/src/index.ts --cron',
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

## 6. Troubleshooting

### `Selector "article[data-automation=normalJob"] not found within 15000ms`

Halaman JobStreet tidak menampilkan job cards dalam 15 detik. Penyebab:

1. **Chrome belum terinstall** → jalankan `npm run diagnose`
2. **Missing shared libraries** → install paket di bagian 1
3. **PYTHON_EXECUTABLE salah** → di Linux pakai `bin/python`, bukan `Scripts/python.exe`
4. **Python venv belum dibuat** → jalankan bagian 2
5. **Bot detection** → error message akan menyebut "bot-detection/block page"
   - Solusi: tambah delay, gunakan proxy residensial
   - Pastikan `SCRAPER_ENGINE=hybrid` agar pakai Playwright (lebih tahan)

### `Python executable not found: .../Scripts/python.exe`

`.env` masih pakai path Windows. Ubah ke:
```
PYTHON_EXECUTABLE=./server/scraper/experiments/.venv/bin/python
```

### `Failed to launch browser: ... No usable sandbox`

Chrome berjalan sebagai root. Pastikan argumen `--no-sandbox` ada
(sudah default di `puppeteer-pool.ts`). Atau jalankan PM2 sebagai user non-root.

### `error while loading shared libraries: libnss3.so`

Install shared libraries (bagian 1), lalu jalankan ulang.

### Bot detection (halaman "Just a moment..." / Cloudflare)

JobStreet/Cloudflare mendeteksi browser automation. Opsi:

1. Pastikan `SCRAPER_ENGINE=hybrid` agar pakai Playwright (paling tahan)
2. Tambah delay: `SCRAPER_DELAY_MIN_MS=3000` `SCRAPER_DELAY_MAX_MS=8000`
3. Gunakan residential proxy (set `HTTPS_PROXY`)
4. Playwright: pastikan pakai `channel="chrome"` (bukan Chromium bawaan)
   karena fingerprint Chrome system lebih mirip browser asli

### Playwright error: `Executable doesn't exist at .../chromium-...`

Browser Playwright belum terinstall:
```bash
source server/scraper/experiments/.venv/bin/activate
playwright install chromium
deactivate
```

Atau pakai Chrome system (sudah install `google-chrome-stable`) dengan
`channel="chrome"` di `playwright_runner.py` (sudah default).
