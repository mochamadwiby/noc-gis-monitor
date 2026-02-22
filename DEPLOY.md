# 🚀 Panduan Deploy — NOC GIS Monitor

## 1. Buat GitHub Release

```bash
# Pastikan semua perubahan sudah di-commit & push
git add -A
git commit -m "release: v1.0.0 — production ready"
git push origin master

# Buat tag
git tag -a v1.0.0 -m "v1.0.0 — stable release"
git push origin v1.0.0
```

Lalu buat Release di GitHub:
1. Buka https://github.com/mochamadwiby/noc-gis-monitor/releases/new
2. Pilih tag `v1.0.0`
3. Title: `v1.0.0 — Stable Release`
4. Klik **Publish release**

---

## 2. Deploy ke Mesin Production

### Prasyarat di Mesin Production

| Kebutuhan | Minimum |
|-----------|---------|
| OS | Ubuntu 20.04+ / Debian 11+ |
| RAM | 1 GB |
| Docker | 24+ |
| Docker Compose | v2 (plugin) |
| Port | 3000 terbuka |

### Install Docker (jika belum)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout & login ulang agar group berlaku
```

### Langkah Deploy

```bash
# 1. Clone repo
git clone https://github.com/mochamadwiby/noc-gis-monitor.git
cd noc-gis-monitor
git checkout v1.0.0

# 2. Buat file environment
cp .env.example .env.local
nano .env.local
```

Isi `.env.local` dengan kredensial production:

```env
SMARTOLT_BASE_URL=https://your-instance.smartolt.com
SMARTOLT_API_TOKEN=your-real-api-token
NEXT_PUBLIC_MAP_CENTER_LAT=-7.5
NEXT_PUBLIC_MAP_CENTER_LNG=112.75
NEXT_PUBLIC_MAP_ZOOM=11
NEXT_PUBLIC_REFRESH_INTERVAL=30000

# Security (Ubah dengan string acak)
NEXTAUTH_SECRET=super-secret-key-noc-123
NEXTAUTH_URL=http://<IP-MESIN>:3000

# Database (Sesuai dengan docker-compose yang akan kita jalankan)
DATABASE_URL="postgresql://nocadmin:nocpassword@db:5432/noc_db?schema=public"
```

```bash
# 3. Jalankan Database terlebih dahulu
docker compose up -d db

# 4. Push Skema Prisma ke Database
# (Kita gunakan instance Node temporary untuk npx)
docker run --rm -v $(pwd):/app -w /app --network noc-gis-monitor_default node:20-alpine sh -c "npx prisma db push"

# 5. Build & jalankan Aplikasi Next.js
docker compose up -d --build

# 6. Cek status
docker compose ps
docker compose logs -f
```

Buka di browser: `http://<IP-MESIN>:3000`

---

## 3. Alternatif: Deploy Tanpa Docker (PM2)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone & setup
git clone https://github.com/mochamadwiby/noc-gis-monitor.git
cd noc-gis-monitor
git checkout v1.0.0
cp .env.example .env.local
nano .env.local   # isi kredensial & DATABASE_URL (ke localhost:5432)

# Siapkan Database
# Anda harus sudah menginstall PostgreSQL di mesin (contoh: sudo apt install postgresql)
# Buat database 'noc_db', user 'nocadmin', password 'nocpassword' (sesuaikan dengan .env.local)

# Install Dependencies & Database Push
npm install
npx prisma db push
npm run build

# Install PM2 & jalankan
sudo npm install -g pm2
pm2 start npm --name "noc-monitor" -- start
pm2 save
pm2 startup   # ikuti instruksi yang muncul
```

---

## 4. Update ke Versi Baru

### Docker
```bash
cd noc-gis-monitor
git pull origin master
git checkout <tag-baru>      # misal v1.1.0
docker compose up -d --build
```

### PM2
```bash
cd noc-gis-monitor
git pull origin master
git checkout <tag-baru>
npm install
npm run build
pm2 restart noc-monitor
```

---

## 5. Monitoring & Troubleshooting

| Aksi | Docker | PM2 |
|------|--------|-----|
| Lihat logs | `docker compose logs -f` | `pm2 logs noc-monitor` |
| Restart | `docker compose restart` | `pm2 restart noc-monitor` |
| Stop | `docker compose down` | `pm2 stop noc-monitor` |
| Status | `docker compose ps` | `pm2 status` |

### Tips
- **Auto-start saat boot**: Docker sudah otomatis (`unless-stopped`). PM2 gunakan `pm2 startup`.
- **Firewall**: Pastikan port 3000 terbuka: `sudo ufw allow 3000`
- **Reverse proxy** (opsional): Gunakan Nginx di depan untuk HTTPS dan custom domain.
