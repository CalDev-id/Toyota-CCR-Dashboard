# Docker Setup

Panduan ini menjalankan aplikasi Next.js dan database MariaDB di Docker.

## 1. Install Prasyarat

Install Docker Desktop, lalu pastikan Docker Desktop sudah running.

## 2. Siapkan Environment

Copy file contoh env sesuai terminal yang dipakai.

macOS/Linux/Git Bash:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Windows CMD:

```bat
copy .env.example .env
```

Kalau `.env.example` tidak ada, buat file baru bernama `.env` di folder project.

Isi `.env` untuk Docker di PC kantor:

```env
MARIADB_ROOT_PASSWORD="ganti-password-db"
MARIADB_DATABASE="toyota_ccr"
MARIADB_PORT=3306

REPORT_DATABASE_URL="mysql://user:password@10.1.1.2:3306/db_tmmin_trace_regrinding"

APP_PORT=3000
AUTH_SECRET="ganti-dengan-secret-panjang"

SEED_USER_NAME="Admin CCR"
SEED_USER_EMAIL="admin@example.com"
SEED_USER_PASSWORD="minimal-8-karakter"
```

Catatan:

- `DATABASE_URL` tidak perlu diisi untuk Docker Compose karena sudah diarahkan ke service `db`.
- `REPORT_DATABASE_URL` wajib diisi. Ini koneksi ke database LAN kantor yang berisi tabel/view report seperti `t_plan_daily_production_*` dan `v_*_summary`.
- Kalau running lokal tanpa database LAN kedua, isi `REPORT_DATABASE_URL` sama dengan database lokal yang punya tabel report.

## 3. Jalankan App + Database

```bash
docker compose up --build
```

Compose akan:

1. Menyalakan MariaDB.
2. Menunggu database ready.
3. Menjalankan `npm run prisma:push`.
4. Menjalankan `npm run seed:user`.
5. Menyalakan aplikasi Next.js.

Buka aplikasi:

```text
http://localhost:3000
```

Login memakai email dan password dari `SEED_USER_EMAIL` dan `SEED_USER_PASSWORD`.

## Command Harian

Stop container:

```bash
docker compose down
```

Jalankan lagi:

```bash
docker compose up
```

Lihat log:

```bash
docker compose logs -f
```

Jalankan ulang schema + seed:

```bash
docker compose run --rm setup
docker compose up -d app
```

Reset database dari nol:

```bash
docker compose down -v
docker compose up --build
```

Perintah reset akan menghapus data database di volume Docker.

## Local Laptop Tanpa Docker

Kalau laptop hanya punya satu database, pakai `.env` seperti ini:

```env
DATABASE_URL="mysql://root@127.0.0.1:3306/Tracebility"
REPORT_DATABASE_URL="mysql://root@127.0.0.1:3306/Tracebility"
AUTH_SECRET="ganti-dengan-secret-panjang"
AUTH_TRUST_HOST=true
SEED_USER_NAME="Admin CCR"
SEED_USER_EMAIL="admin@example.com"
SEED_USER_PASSWORD="minimal-8-karakter"
```

Lalu jalankan:

```bash
npm run prisma:generate
npm run prisma:push
npm run seed:user
npm run dev
```
