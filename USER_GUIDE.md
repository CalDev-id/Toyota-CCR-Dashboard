# User Guide Toyota CCR Dashboard

## 1. Tujuan Aplikasi

Toyota CCR Dashboard mendukung pemantauan dan pengelolaan informasi produksi di area PPIC dan Warehouse. Aplikasi menyatukan data produksi, production achievement, stock, shipment, line stop, dan planning dalam satu dashboard.

Tujuan penggunaan aplikasi:

- Memantau kondisi serta pencapaian produksi secara cepat.
- Membandingkan actual produksi terhadap plan.
- Menyediakan data pendukung untuk Asakai Board.
- Memantau masalah line stop dan dampaknya.
- Mengelola planning bulanan dan harian sesuai hak akses pengguna.

> **Catatan:** beberapa menu pengelolaan data hanya tampil untuk pengguna yang mempunyai hak akses.

## 2. Login

Halaman Login digunakan untuk masuk ke Toyota CCR Dashboard.

### Cara menggunakan

1. Buka halaman Login aplikasi.
2. Masukkan email yang telah terdaftar pada kolom **Email**.
3. Masukkan password pada kolom **Password**.
4. Pilih tombol **Login**.
5. Setelah login berhasil, aplikasi membuka halaman Home.

Jika email atau password tidak sesuai, aplikasi menampilkan pesan bahwa kredensial tidak valid. Jika pengguna membuka tautan menu tertentu sebelum login, aplikasi akan mengarahkan pengguna kembali ke menu tersebut setelah login berhasil.

## 3. Home

Home adalah halaman ringkasan kondisi produksi bulan berjalan. Gunakan halaman ini sebagai titik awal untuk melihat performa umum sebelum membuka menu analisis yang lebih rinci.

### Informasi yang tersedia

- Kartu ringkasan **AV**, **PE**, **RQ**, dan **OEE** rata-rata bulan berjalan, termasuk indikator tren terhadap periode sebelumnya.
- **Monthly Production Trend**, yaitu grafik actual produksi per hari. Arahkan kursor ke batang grafik untuk melihat plan, actual, dan balance pada tanggal tersebut.
- **Monthly Target**, yaitu total plan, actual, balance, dan progress target bulan berjalan.
- **Line Performance**, yaitu OEE rata-rata setiap line.
- **Plan vs Actual Gap**, yaitu tabel plan, actual, gap, dan status pencapaian setiap line.

### Cara menggunakan

1. Buka menu **Home** pada sidebar.
2. Lihat kartu metrik untuk menilai performa umum bulan berjalan.
3. Gunakan grafik tren dan tabel gap untuk mengidentifikasi tanggal atau line dengan pencapaian rendah.
4. Buka menu Asakai Board atau Production Achievement bila diperlukan analisis lebih detail.

## 4. Asakai Board

Asakai Board digunakan untuk membandingkan kondisi beberapa line produksi sejak hari pertama bulan berjalan sampai tanggal yang dipilih.

### Fitur umum

- Pilihan **Tanggal** untuk menentukan batas data yang ditampilkan.
- Tombol **Layar Penuh** untuk menampilkan board dalam ukuran besar saat meeting atau display monitor.
- Kartu ringkasan OEE setiap line.
- Grafik dan indikator pembanding kondisi produksi antarline.

### Cara menggunakan

1. Buka menu **Asakai Board** pada sidebar.
2. Pilih **Asakai Board Realtime** atau **Asakai Board Manual**.
3. Atur tanggal pada kolom **Tanggal**.
4. Tinjau kartu dan grafik tiap line.
5. Pilih **Layar Penuh** bila board akan digunakan untuk presentasi atau monitoring bersama. Pilih **Keluar Layar Penuh** untuk kembali ke tampilan normal.

### 4.1 Asakai Board Realtime

Asakai Board Realtime menampilkan data yang berasal dari sumber realtime produksi. Halaman ini dapat digunakan untuk pemantauan kondisi produksi terkini dan bahan diskusi Asakai.

Informasi yang dapat dipantau:

- Pencapaian OEE setiap line.
- Perbandingan data produksi dan data per shift.
- Gap antara plan dan actual.
- Informasi stock machining.
- Status shipment atau vanning.
- Informasi LSR yang relevan dengan line.

### 4.2 Asakai Board Manual

Asakai Board Manual menyediakan tampilan perbandingan line yang sama, dengan data manual sebagai sumber analisis.

#### Cara menggunakan

1. Buka **Asakai Board Manual**.
2. Pilih tanggal yang ingin ditinjau.
3. Bandingkan hasil antarline melalui kartu OEE dan grafik yang tersedia.
4. Pastikan data manual pendukung telah diinput melalui menu Input Data apabila informasi yang diharapkan belum tampil.

## 5. Input Data

Menu Input Data digunakan untuk mengelola tiga data pendukung Asakai Board: Stock, Shipment, dan LSR. Setiap halaman mendukung import Excel dan pengelolaan data dalam tabel.

### Alur umum import

1. Buka jenis data yang ingin diinput.
2. Pilih tombol **Import Data**.
3. Pilih file Excel yang sesuai.
4. Jalankan proses import.
5. Jika aplikasi menemukan data lama dengan isi berbeda, periksa daftar konflik lalu pilih pembaruan data bila memang sesuai.
6. Periksa data pada tabel setelah import selesai.

> **Penting:** gunakan nama sheet dan header kolom yang sesuai. File yang tidak sesuai akan ditolak oleh aplikasi.

### 5.1 Input Stock

Halaman **Input Stock** digunakan untuk mengimpor dan mengelola data stock Asakai berdasarkan tanggal, line, dan type.

#### Fitur yang tersedia

- Memilih rentang tanggal yang ingin dilihat.
- Mengurutkan data melalui nama kolom pada tabel.
- Mengimpor data stock dari Excel.
- Mengubah nilai data stock secara langsung pada tabel.
- Menyimpan seluruh perubahan melalui tombol **Update**.
- Memilih satu atau beberapa baris dan menghapusnya melalui tombol hapus.

#### Cara mengimpor data stock

1. Buka **Input Data** > **Input Stock**.
2. Pilih **Import Data Stock**.
3. Pilih file Excel stock.
4. Pilih **Import**.
5. Jika muncul daftar data yang berubah, periksa tanggal, line, dan type pada daftar tersebut.
6. Pilih **Update data** untuk mengganti data lama, atau **Batal** untuk tidak meneruskan pembaruan.

#### Ketentuan file Excel stock

Sheet wajib bernama `Input_Act_Stock`.

| Kelompok data | Kolom yang diperlukan |
|---|---|
| Identitas | `Date`, `Line`, `Type`, `Unit/Module`, `Module_Code` |
| Target dan produksi | `Target_Day`, `Target_Module`, `Act_Module`, `Act_Local` |
| Stock | `Actual_Stock_Unit_ES_PackComp_New`, `Actual_Stock_Unit_ADV_New`, `Balance_Stock_ADV_New` |

#### Cara mengubah atau menghapus data

1. Atur rentang tanggal agar data yang dicari tampil.
2. Ubah nilai pada kolom yang dapat diedit.
3. Pilih **Update** untuk menyimpan perubahan.
4. Untuk menghapus, centang baris yang tidak diperlukan, pilih tombol hapus, lalu konfirmasi penghapusan.

### 5.2 Input Shipment

Halaman **Input Shipment** digunakan untuk mengimpor data shipment bulanan dan memantau status penyelesaian shipment.

#### Fitur yang tersedia

- Memilih sumber sheet shipment yang akan ditampilkan.
- Mengimpor data shipment dari Excel.
- Mengubah informasi shipment pada tabel.
- Mengurutkan data berdasarkan tanggal vanning atau remark.
- Menyimpan pembaruan dan menghapus data terpilih.
- Memantau remark/status shipment, termasuk status **Complete** yang dapat diperbarui otomatis berdasarkan data produksi.

#### Cara mengimpor data shipment

1. Buka **Input Data** > **Input Shipment**.
2. Pilih **Import Data Shipment**.
3. Pilih file shipment bulanan.
4. Pilih **Import**.
5. Apabila data existing berubah, aplikasi menampilkan daftar konflik. Periksa lalu pilih **Update data** untuk memperbarui data tersebut.
6. Setelah selesai, pilih sheet yang diperlukan dan periksa data pada tabel.

#### Ketentuan file Excel shipment

File dapat memuat satu atau beberapa sheet berikut: `CB TMC`, `CB STM`, `CH TMC`, `CH STM`, `CR TMC`, `CR STM`, dan `CA STM`.

| Kolom wajib | Keterangan |
|---|---|
| `Line` | Identitas line shipment |
| `Dest` | Tujuan shipment |
| `Module no` | Nomor module |
| `Renban` | Nomor renban |
| `Vanning Date` | Tanggal vanning |

Kolom seperti ETD, remark, atau tanggal completion dapat digunakan bila tersedia pada file dan akan ditampilkan pada data shipment.

#### Cara mengubah atau menghapus data

1. Pilih sheet yang sesuai.
2. Ubah nilai pada baris yang diperlukan.
3. Pilih **Update** untuk menyimpan seluruh perubahan.
4. Centang satu atau beberapa baris, pilih tombol hapus, lalu konfirmasi untuk menghapus data.

### 5.3 Input LSR

Halaman **Input LSR** digunakan untuk mengimpor dan mengelola data LSR dan data target dari satu file Excel.

#### Fitur yang tersedia

- Tab **Data LSR** untuk melihat dan mengubah catatan LSR.
- Tab **Data Target** untuk melihat dan mengubah target harian maupun kumulatif.
- Tab **Filter LSR Asakai** untuk memilih part number yang dihitung pada LSR Unit Base (Weekly).
- Filter tanggal LSR atau bulan target serta filter shop.
- Import, update, dan hapus data pada tabel aktif.

#### Cara mengimpor data LSR

1. Buka **Input Data** > **Input LSR**.
2. Pada tab **Data LSR** atau **Data Target**, atur tanggal atau bulan yang diperlukan.
3. Pilih **Import Data LSR**, pilih file, lalu pilih **Import**.
4. Jika aplikasi mendeteksi data lama yang berubah, periksa daftar konflik lalu pilih **Update data** bila data file harus digunakan.
5. Gunakan filter shop untuk memeriksa hasil import.

#### Ketentuan file Excel LSR

| Sheet | Kolom yang diperlukan |
|---|---|
| `LSR` | `DATE`, `SHIFT`, `SHIFT2`, `SHOP`, `PART NO.`, `REASON`, `PART NAME`, `QTY`, `Price /unit`, `Total Price` |
| `Target` | `Date`, `Shop`, `Target_Daily`, `Target_Cumm.` |

#### Cara memperbarui filter LSR Asakai

1. Buka tab **Filter LSR Asakai**.
2. Pilih atau hapus pilihan part number pada masing-masing line.
3. Pilih **Simpan Filter**.

Part number yang dipilih digunakan sebagai dasar perhitungan LSR pada Asakai Board.

## 6. Production Achievement

Menu Production Achievement digunakan untuk memantau pencapaian produksi berdasarkan tanggal dan shift.

### 6.1 Production Achievement Machining

Halaman **Prod Acv Machining** menampilkan pencapaian line Assy, Cylinder Block, Cylinder Head, Camshaft, dan Crankshaft.

#### Informasi yang tersedia pada setiap line

- Plan produksi dan total daily plan.
- Actual produksi, input, dan scan.
- Nilai AV, PE, RQ, dan OEE.
- Balance produksi.
- Takt time actual dan plan.
- Overtime, jam kerja actual, stop time, masalah AV/PE/RQ, serta perincian pencapaian per varian.

#### Cara menggunakan filter

1. Buka **Production Achievement** > **Prod Acv Machining**.
2. Pilih tanggal dan shift yang ingin dipantau.
3. Tunggu data setiap kartu line diperbarui.
4. Bandingkan plan, actual, OEE, balance, dan daftar masalah antarline.

#### Cara mengunduh data

1. Atur tanggal dan shift yang diperlukan.
2. Pilih tombol **Download**.
3. Pilih **Laporan Excel**, **Data Excel**, **Monthly Excel**, atau **BackFlush**.
4. Tunggu hingga file selesai disiapkan dan terunduh.

#### Peringatan line stop

Jika data suatu line tidak diperbarui dalam batas waktu kerja yang ditentukan, aplikasi dapat menampilkan **Line Stop Alert** dan suara alarm. Pengguna berwenang dapat memilih status **Running**, **Chokotei**, **Line Stop**, atau **No Production**. Keputusan yang disimpan digunakan sebagai status bersama pada pengecekan berikutnya.

### 6.2 Production Achievement Packom

Halaman **Prod Acv Packom** digunakan untuk memantau pencapaian produksi Packom berdasarkan tanggal dan shift.

#### Informasi yang tersedia

- Plan dan actual module setiap line Packom.
- Daftar module atau case number yang sedang diproses.
- Progress terhadap capacity atau jumlah unit.
- Penanda **Prev. shift** apabila data berasal dari shift sebelumnya.
- Penanda progress untuk case yang masih berjalan.

#### Cara menggunakan

1. Buka **Production Achievement** > **Prod Acv Packom**.
2. Pilih tanggal dan shift.
3. Tinjau kartu setiap line untuk melihat plan, actual module, dan detail progress module.
4. Gunakan informasi case number untuk mengetahui pekerjaan yang telah selesai atau masih berjalan.

Data diperbarui secara berkala selama periode produksi aktif.

### 6.3 Linestop Report

Halaman **Linestop Report** menampilkan analisis Pareto masalah line stop per line berdasarkan akumulasi durasi AV dan PE.

#### Fitur yang tersedia

- Pilihan bulan, line, dan shift sebagai filter laporan.
- Tabel dan grafik Pareto 10 masalah dengan durasi tertinggi pada setiap line.
- Grand total dalam menit, jam, dan estimasi unit terdampak.
- Tombol **Lihat semua** untuk melihat seluruh masalah yang sudah terkategori.
- Tombol **Belum terkategori** untuk melihat problem yang belum cocok dengan master mesin.
- Unduh laporan dalam format PDF atau Excel.
- **Kelola master** untuk mengatur master mesin bagi pengguna berwenang.

#### Cara menggunakan laporan

1. Buka **Linestop Report**.
2. Pilih bulan, line, dan shift sesuai kebutuhan.
3. Tinjau grafik Pareto untuk menemukan problem dengan waktu terbesar.
4. Pilih **Lihat semua** bila memerlukan seluruh daftar problem pada line tersebut.
5. Jika terdapat problem belum terkategori, pilih tombol **Belum terkategori** untuk meninjaunya.
6. Pilih **Download** lalu tentukan **Download PDF** atau **Download Excel** apabila laporan perlu dibagikan.

#### Cara mengelola master mesin

1. Pilih **Kelola master** dan pilih line yang akan dikelola.
2. Pilih **Tambah mesin** untuk menambahkan master baru, atau **Edit** untuk mengubah nama mesin.
3. Pilih **Hapus** untuk menghapus master mesin yang tidak diperlukan.
4. Simpan perubahan.

## 7. Planning

Menu Planning digunakan untuk mengelola rencana produksi bulanan dan harian.

### 7.1 Monthly Planning

Monthly Planning digunakan untuk melihat dan mengelola planning berdasarkan line/part, periode bulan, shift, dan group.

#### Fitur yang tersedia

- Filter bulan, line/part, shift, dan group.
- Tabel detail planning sesuai filter yang dipilih.
- Tambah baris planning baru.
- Ubah data planning langsung di tabel dan simpan melalui tombol **Update**.
- Import data dari Excel.
- Hapus satu atau beberapa baris planning yang dipilih.

Fitur tambah, update, import, dan hapus hanya tampil bagi pengguna yang memiliki wewenang pengelolaan planning.

#### Cara menggunakan

1. Buka menu **Planning** > **Monthly Planning**.
2. Pilih bulan, line/part, shift, dan group.
3. Tabel akan menampilkan planning sesuai filter.
4. Pilih **Add Row** untuk data baru atau ubah nilai pada baris yang telah ada, kemudian pilih **Update**.
5. Untuk import, pilih **Import Excel**, pilih file, dan konfirmasi penggantian bila ditemukan conflict pada tanggal, shift, dan group yang sama.
6. Untuk menghapus, centang baris planning, pilih tombol hapus, lalu konfirmasi.

### 7.2 Daily Planning

Daily Planning digunakan untuk mengatur planning produksi harian berdasarkan tanggal dan shift.

#### Fitur yang tersedia

- Filter tanggal dan shift.
- Pengaturan total plan, OEE, ratio, dan remark.
- Pengaturan slot waktu planning aktif.
- Pengaturan overtime awal, overtime akhir, dan overtime night.
- Pengaturan **Ramadan Schedule** untuk periode yang dipilih.
- **Daily Planning History** untuk melihat riwayat perubahan.
- Penghapusan daily planning dengan riwayat perubahan tetap tersimpan.

#### Cara menggunakan

1. Buka **Planning** > **Daily Planning**.
2. Pilih tanggal dan shift yang akan diatur.
3. Periksa nilai plan, OEE, ratio, dan slot waktu yang tampil.
4. Ubah nilai atau tambahkan slot/OT sesuai kebutuhan; isi remark bila diperlukan.
5. Pilih **Simpan & Terapkan Perubahan**.
6. Gunakan **Daily Planning History** untuk meninjau perubahan sebelumnya.
7. Bila perlu menghapus planning aktif, pilih **Hapus Daily Planning** dan konfirmasi. Riwayat perubahan tetap tersedia.

## 8. Users

Halaman **Users** digunakan untuk mengelola akun pengguna aplikasi dan hanya tersedia untuk Admin.

### Fitur yang tersedia

- Membuat akun pengguna baru.
- Melihat daftar akun yang dapat login ke dashboard.
- Mengubah nama, email, role, atau password pengguna.
- Menghapus akun pengguna.

Role yang tersedia adalah **Admin**, **CCR Operation**, **CCR Group Leader**, dan **User**. Menu yang dapat diakses pengguna menyesuaikan role yang diberikan.

### Cara membuat user

1. Buka menu **Users**.
2. Isi nama, email, password, konfirmasi password, dan role pada formulir **Create User**.
3. Password harus terdiri dari minimal 8 karakter.
4. Pilih **Create User** dan periksa daftar Users untuk memastikan akun baru telah dibuat.

### Cara mengubah atau menghapus user

1. Cari user pada tabel **Users**.
2. Pilih **Edit** untuk mengubah nama, email, role, dan/atau password, lalu simpan perubahan.
3. Pilih **Delete** untuk menghapus akun, periksa kembali targetnya, lalu konfirmasi penghapusan.

## 9. Catatan Penggunaan

- Pastikan file Excel menggunakan nama sheet dan header kolom yang sesuai sebelum import.
- Periksa daftar konflik sebelum menyetujui pembaruan data dari file Excel.
- Gunakan filter tanggal, shift, bulan, line, dan group untuk memastikan data yang ditampilkan sesuai kebutuhan.
- Periksa kembali data sebelum memilih Update, Save, atau Delete.
- Hubungi Admin aplikasi apabila tidak dapat login atau tidak dapat mengakses menu yang diperlukan.
