# Docker Setup

Panduan ini menjalankan aplikasi Next.js dan database MariaDB di Docker.

## 1. Install Prasyarat

Install Docker Desktop, lalu pastikan Docker Desktop sudah running.

## 2. Siapkan Environment

Copy file contoh env:

```bash
cp .env.example .env
```

Isi `.env` untuk Docker:

```env
MARIADB_ROOT_PASSWORD="ganti-password-db"
MARIADB_DATABASE="toyota_ccr"
MARIADB_PORT=3306

APP_PORT=3000
AUTH_SECRET="ganti-dengan-secret-panjang"

SEED_USER_NAME="Admin CCR"
SEED_USER_EMAIL="admin@example.com"
SEED_USER_PASSWORD="minimal-8-karakter"
```

Catatan: `DATABASE_URL` tidak perlu diisi untuk Docker Compose karena sudah diarahkan ke service `db`.

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
