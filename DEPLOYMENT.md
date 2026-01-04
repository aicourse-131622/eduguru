# 🎓 EduGuru - Deployment Guide

> Panduan lengkap untuk mendeploy EduGuru di VPS dengan aaPanel

## 📋 Daftar Isi

1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Persiapan Server](#persiapan-server)
3. [Setup Database](#setup-database)
4. [Deployment Aplikasi](#deployment-aplikasi)
5. [Konfigurasi Gemini AI](#konfigurasi-gemini-ai)
6. [Konfigurasi Nginx](#konfigurasi-nginx)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 🖥️ Persyaratan Sistem

### Minimum Requirements
- **OS**: Ubuntu 20.04+ / CentOS 7+
- **RAM**: 1GB (2GB recommended)
- **Storage**: 10GB SSD
- **Node.js**: 18.x atau lebih baru
- **PostgreSQL**: 14.x atau lebih baru

### Software yang Dibutuhkan
- aaPanel (sudah terinstall)
- Node.js (install via aaPanel App Store)
- PostgreSQL (install via aaPanel App Store)
- PM2 (untuk process management)
- Nginx (termasuk di aaPanel)

---

## 🔧 Persiapan Server

### 1. Login ke aaPanel

```
URL: http://YOUR_VPS_IP:8888
Username: admin (atau sesuai setup)
Password: (sesuai setup)
```

### 2. Install Required Software via aaPanel App Store

1. **Node.js Manager**
   - Buka App Store
   - Install "Node.js Manager"
   - Install Node.js v18.x atau v20.x

2. **PostgreSQL**
   - Install PostgreSQL 14 atau 15
   - Catat password root yang dibuat

3. **PM2**
   ```bash
   npm install -g pm2
   ```

---

## 🗄️ Setup Database

### 1. Buat Database Baru

Via aaPanel Database Manager:
1. Buka **Database** → **Add Database**
2. Database Name: `eduguru`
3. Username: `eduguru_user`
4. Password: (generate password kuat)
5. Access Rights: Local

### 2. Inisialisasi Schema (Opsional)

Jika ingin menjalankan schema secara manual:

```bash
psql -U eduguru_user -d eduguru -f /www/wwwroot/eduguru/schema.sql
```

> **Note**: Server akan auto-create tables saat pertama kali dijalankan.

---

## 📦 Deployment Aplikasi

### 1. Upload File Aplikasi

**Opsi A: Via aaPanel File Manager**
1. Buka File Manager
2. Navigate ke `/www/wwwroot/`
3. Buat folder `eduguru`
4. Upload semua file proyek

**Opsi B: Via Git (Recommended)**
```bash
cd /www/wwwroot/
git clone https://github.com/yourusername/eduguru.git
cd eduguru
```

### 2. Konfigurasi Environment

```bash
cd /www/wwwroot/eduguru
cp .env.example .env
nano .env
```

Edit file `.env`:
```env
# Server
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_super_secret_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eduguru
DB_USER=eduguru_user
DB_PASSWORD=your_db_password_here
DB_SSL=false

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Build frontend untuk production
npm run build
```

### 4. Install Backend Dependencies

```bash
# Install backend dependencies (untuk server.js)
npm install express cors pg dotenv bcryptjs jsonwebtoken @google/generative-ai
```

### 5. Jalankan dengan PM2

```bash
# Start aplikasi dengan PM2
pm2 start ecosystem.config.js --env production

# Pastikan PM2 auto-start saat server reboot
pm2 save
pm2 startup
```

### 6. Verifikasi Deployment

```bash
# Cek status PM2
pm2 status

# Cek logs
pm2 logs eduguru

# Test health endpoint
curl http://localhost:3001/health
```

---

## 🤖 Konfigurasi Gemini AI

### 1. Dapatkan API Key

1. Buka [Google AI Studio](https://aistudio.google.com/apikey)
2. Login dengan akun Google
3. Klik "Create API Key"
4. Copy API Key yang dihasilkan

### 2. Update Environment

```bash
nano /www/wwwroot/eduguru/.env
```

Tambahkan:
```env
GEMINI_API_KEY=AIzaSy...your_api_key_here
```

### 3. Restart Server

```bash
pm2 restart eduguru
```

### 4. Verifikasi AI Status

```bash
curl http://localhost:3001/health
```

Response harus menunjukkan `"ai": "enabled"`

---

## 🌐 Konfigurasi Nginx

### 1. Buat Website di aaPanel

1. **Website** → **Add Site**
2. Domain: `yourdomain.com`
3. PHP Version: Pure Static (atau tidak pilih)
4. Create database: Skip (sudah dibuat)

### 2. Edit Nginx Configuration

1. **Website** → klik domain Anda → **Config**
2. Pilih **Nginx Conf**
3. Replace dengan konfigurasi di file `nginx.conf`
4. Ganti `yourdomain.com` dengan domain Anda

### Konfigurasi Minimal:

```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
}

location /health {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

location / {
    root /www/wwwroot/eduguru/dist;
    try_files $uri $uri/ /index.html;
}
```

### 3. Setup SSL (HTTPS)

1. **Website** → domain Anda → **SSL**
2. Pilih "Let's Encrypt" untuk SSL gratis
3. Klik "Apply"
4. Enable "Force HTTPS"

### 4. Reload Nginx

```bash
nginx -s reload
# atau via aaPanel
```

---

## 📊 Monitoring & Maintenance

### PM2 Commands

```bash
# Status aplikasi
pm2 status

# Logs real-time
pm2 logs eduguru

# Restart aplikasi
pm2 restart eduguru

# Stop aplikasi
pm2 stop eduguru

# Monitoring dashboard
pm2 monit
```

### Update Aplikasi

```bash
cd /www/wwwroot/eduguru

# Pull latest code
git pull origin main

# Install dependencies jika ada yang baru
npm install

# Rebuild frontend
npm run build

# Restart server
pm2 restart eduguru
```

### Backup Database

```bash
# Backup
pg_dump -U eduguru_user eduguru > backup_$(date +%Y%m%d).sql

# Restore
psql -U eduguru_user -d eduguru < backup_20241230.sql
```

---

## ❓ Troubleshooting

### 1. Error: Port 3001 sudah digunakan

```bash
# Cari proses yang menggunakan port
lsof -i :3001

# Kill proses
kill -9 <PID>

# Restart aplikasi
pm2 restart eduguru
```

### 2. Database Connection Error

```bash
# Test koneksi database
psql -U eduguru_user -d eduguru -h localhost

# Pastikan PostgreSQL berjalan
systemctl status postgresql
systemctl start postgresql
```

### 3. Gemini AI Error: "AI service unavailable"

1. Pastikan `GEMINI_API_KEY` sudah benar di `.env`
2. Cek apakah API Key masih valid di [Google AI Studio](https://aistudio.google.com/apikey)
3. Restart server: `pm2 restart eduguru`

### 4. 502 Bad Gateway

```bash
# Cek apakah server backend berjalan
pm2 status

# Jika stopped, restart
pm2 restart eduguru

# Cek logs untuk error
pm2 logs eduguru --lines 100
```

### 5. Login Tidak Berfungsi

1. Pastikan database sudah terkoneksi
2. Cek apakah tabel `users` sudah ada
3. Buat akun baru melalui halaman Register

### 6. Static Files Tidak Termuat

```bash
# Pastikan folder dist ada
ls -la /www/wwwroot/eduguru/dist

# Jika kosong, rebuild
npm run build

# Cek permission
chown -R www:www /www/wwwroot/eduguru
```

---

## 📝 Catatan Penting

1. **Keamanan**: Ganti `JWT_SECRET` dengan string yang kuat dan unik
2. **Backup**: Lakukan backup database secara berkala
3. **SSL**: Selalu gunakan HTTPS di production
4. **Monitoring**: Gunakan PM2 Plus atau tools lain untuk monitoring
5. **Updates**: Update dependencies secara berkala untuk keamanan

---

## 🆘 Butuh Bantuan?

Jika mengalami kendala:
1. Cek logs: `pm2 logs eduguru`
2. Cek health endpoint: `curl http://localhost:3001/health`
3. Pastikan semua environment variables sudah benar
4. Restart services: `pm2 restart all && nginx -s reload`

---

**Happy Deploying! 🚀**
