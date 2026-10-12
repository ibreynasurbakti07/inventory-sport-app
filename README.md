# Sportstock — Aplikasi Persediaan Perlengkapan Olahraga

Aplikasi web satu halaman untuk mencatat dan mengelola persediaan perlengkapan olahraga.

🌐 **Demo website:** [https://ibreynasurbakti07.github.io/inventory-sport-app/](https://ibreynasurbakti07.github.io/inventory-sport-app/)

Sportstock membantu memantau stok, kategori, pemasok, dan mutasi barang masuk maupun keluar. Aplikasi dibuat dengan HTML, CSS, dan JavaScript, serta menggunakan Supabase Auth dan PostgreSQL REST API untuk autentikasi dan penyimpanan data.

Halaman utama repository mengarahkan pengunjung ke aplikasi di folder `frontend`, sehingga link demo di atas tetap dapat digunakan.

## Struktur

```text
frontend/
  index.html
  styles.css
  app.js
  supabase-config.js
backend/
  schema.sql
docs/
  skema-sistem-persediaan.md
```

## Menyiapkan Supabase

1. Jalankan `backend/schema.sql` melalui SQL Editor Supabase. Jalankan ulang jika tabel sudah dibuat sebelumnya agar policy RLS terbaru ikut diterapkan.
2. Pastikan pendaftaran email diaktifkan pada pengaturan **Authentication** Supabase. Aplikasi menyediakan tombol **Daftar** pada layar login.
3. Buka `frontend/supabase-config.js`. URL proyek sudah terisi; ganti placeholder dengan **publishable key** dari **Project Settings → API Keys**.
4. Sajikan folder `frontend` melalui server file statis, misalnya ekstensi VS Code Live Server, lalu buka alamat lokal yang diberikan.

Jangan buka `index.html` sebagai `file://`; gunakan alamat `http://localhost` agar permintaan ke Supabase berjalan normal.

## Akses dan keamanan

Daftar atau login menggunakan Supabase Auth. Jika konfirmasi email diwajibkan, klik tautan di email sebelum login. Token sesi disimpan di browser dan diperbarui menggunakan refresh token. RLS mengizinkan CRUD hanya untuk pengguna yang sudah login; semua pengguna login saat ini berbagi data persediaan yang sama.

Frontend hanya memakai publishable key. Jangan masukkan service-role key ke file frontend. Jika service-role key pernah dibagikan atau tertanam di nilai konfigurasi, revoke/rotate key tersebut dari dashboard Supabase.

## Mengunggah ke GitHub

Sebelum mengunggah, pastikan `backend/.env` atau file environment lokal tidak ikut ditambahkan. Aturan tersebut sudah ada di `.gitignore`. `frontend/supabase-config.js` berisi URL proyek dan publishable key yang dirancang untuk dipakai di frontend; keduanya bukan pengganti RLS. Jangan pernah menaruh `service_role` atau `sb_secret_` key di repository atau kode browser.

Dokumentasi ERD dan detail kolom ada di [docs/skema-sistem-persediaan.md](docs/skema-sistem-persediaan.md).

## ERD

```text
categories 1 ─── * products * ─── 0..1 suppliers
                         1
                         └────── * stock_movements
```

`products` menyimpan stok terkini. Setiap insert pada `stock_movements` otomatis memperbarui stok melalui trigger PostgreSQL; transaksi barang keluar ditolak jika stok tidak mencukupi.