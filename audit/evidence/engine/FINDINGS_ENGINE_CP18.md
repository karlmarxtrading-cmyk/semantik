# Audit mesin terjemahan CP18

## Ruang lingkup dan metode

Sumber: arsip CP18 yang diekstrak tanpa perubahan pada `source/r/7a8e787a497535f5/`. Modul yang ditelusuri: `app/translation.js`, `app/semantic-spans.js`, jalur pemanggilan di `app/main.js`, `MODEL_NOTICE.txt`, dan jalur inferensi/pemuatan model dalam `assets/engine.worker-4c3dcfee.js`.

Dijalankan **28 kasus terarah** melalui adapter asli dan model ONNX bawaan, ditambah **6 kontrol notasi turunan**. Transport worker, fetch berkas lokal, Cache Storage RAM, dan lokasi WASM dijembatani ke Node 24; bobot, tokenizer, algoritme decoder, dan kode perlindungan makna tidak diganti. Ini membuktikan keluaran inferensi yang diberikan berkas proyek, bukan hasil pengujian lengkap browser atau ekstraksi PDF. Input kasus adalah kalimat dan paragraf sintetis untuk audit, bukan korpus jurnal teranotasi. Hasil tidak boleh dikonversi menjadi persentase akurasi produksi.

Tersedia pula 12 uji validator: 4 kontrol masalah lama, 6 mutasi sintetis lain, dan 2 replay keluaran model aktual. Mutasi validator bukan bukti bahwa model selalu membuat kesalahan tersebut.

## Kesimpulan

Mesin belum memenuhi target penerjemah ilmiah yang dapat langsung diunduh tanpa keharusan pemeriksaan pengguna. Sebagian penguatan lama sudah bekerja, namun terdapat **kerusakan notasi matematika dan perubahan makna yang dinyatakan `translated` dengan `issues: []`**. Menambah glosarium secara terus-menerus tidak menyelesaikan kelas masalah ini secara menyeluruh.

## ENG-01 — P1: notasi turunan rusak tanpa peringatan

**Bukti aktual:**

| Input | Keluaran aktual | Status |
|---|---|---|
| `Given f(x)=x², the derivative is f′(x)=2x.` | `Mengingat f(x)=x², turunan adalah fåx)=2x.` | translated, issues kosong |
| `Given f(x)=x², the derivative is f'(x)=2x.` | `Mengingat f(x)=x², turunan adalah f' Allahx)=2x.` | translated, issues kosong |
| `Given 𝑓(𝑥)=𝑥², the derivative is 𝑓′(𝑥)=2𝑥.` | `Mengingat 𝑓(𝑥)=𝑥², turunan adalah 𝑓𝑥)=2𝑥.` | translated, issues kosong |
| `The second derivative is f″(x)=2.` | `Turunan kedua adalah fáräx) =2.` | translated, issues kosong |

Kontrol `The function f(x)=2x is linear.` menghasilkan `Fungsi f(x)=2x adalah linear.`. Kontrol formula yang sudah dibungkus `$...$` mempertahankan kedua formula tepat. Menambahkan spasi pada `f′(x) = 2x` tidak mencegah kerusakan.

**Akar sebab:** `semantic-spans.js:112` mengharuskan kurung sesudah nama fungsi/subskrip; suffix `'`, `′`, `″` tidak dikenali. Daftar simbol pada baris 7 juga tidak mencakup prime. `translation.js:65–67` membandingkan hanya span yang dikenali; pada replay aktual, span sebelum dan sesudah sama walaupun bagian `f′(x)` rusak. `translation.js:267` kemudian memberi status translated. Ini bukan sekadar ketidakrapian font dan bukan efek OCR: input probe sudah berupa teks benar.

**Penguatan:** matematika perlu dikenali dan diisolasi sebagai ekspresi utuh sebelum penerjemahan prosa; cakup derivatif, aksen, sub/superskrip, operator, dan fungsi. Validasi token/struktur matematika utuh sebelum hasil boleh menjadi keluaran final. Contoh ini harus menjadi regresi wajib dari PDF sampai `.md`, bukan hanya pemeriksaan daftar simbol. Pengguna tidak boleh diwajibkan membungkus rumus PDF dengan `$` secara manual.

## ENG-02 — P1: perubahan istilah dan cakupan logis lolos sebagai terjemahan selesai

**Bukti aktual dua arah:**

1. Input ID lengkap: `Penelitian ini menilai hubungan antara paparan partikulat halus dan rawat inap. Analisis mencakup 240 peserta yang diikuti selama 12 bulan. Meskipun rasio risiko yang disesuaikan adalah 1.20, interval kepercayaan mencakup nilai nol. Temuan ini tidak membuktikan hubungan sebab akibat dan harus ditafsirkan secara hati-hati.`
   Keluaran diawali `This study assessed the relationship between exposure to delicate party and intrusive care.`. `partikulat halus` dan `rawat inap` kehilangan makna ilmiahnya. Seluruh paragraf berstatus translated dengan issues kosong.
2. Input ID: `Himpunan penyelesaian pertidaksamaan tersebut adalah ∅. Tidak ada bilangan riil yang memenuhi kedua syarat.`
   Keluaran: `Solution set inequality is ∅. No real number satisfies second condition.`. **Kedua syarat** berarti kedua kondisi bersama, sedangkan **second condition** berarti kondisi kedua. Ini perubahan proposisi, bukan pilihan gaya. Status translated, issues kosong.
3. Input EN: `The trial failed to demonstrate non-inferiority.` → `Pengadilan gagal menunjukkan non-inferiority.`. Konteks pengujian noninferioritas menjadi pengadilan. Status translated, issues kosong.
4. Input EN: `The upper confidence limit exceeded the non-inferiority margin.` → `Batas kepercayaan diri atas melebihi batas non-inferiority.`. Istilah statistik `confidence limit` berubah ke “kepercayaan diri”. Status translated, issues kosong.
5. Input ID: `Kami tidak dapat menyingkirkan kemungkinan perancuan residual.` → `We can't get rid of possible residueal interference.`. Istilah residual confounding tidak terpelihara. Status translated, issues kosong.

**Akar desain:** adapter memberi constraint glosarium terbatas (`translation.js:9–24,75–100`), split kalimat/klausa (`124–154,234–265`), dan peringatan berbasis pola (`156–180`). Kuantor `kedua`/`both` tidak ada dalam pola pada baris 170. Tiap keluaran secara jujur memiliki `semanticVerified:false`, tetapi seluruh hasil yang lolos struktur tetap tersedia sebagai terjemahan; struktur yang lolos bukan verifikasi makna. Model yang dipakai adalah OPUS 2019-12-18 q8 untuk kedua arah, dengan batas aktual 128 token input dan 256 token output (metadata hasil prepare). Tahun model sendiri bukan bukti kegagalan; keluaran aktual di atas adalah buktinya.

**Penguatan:** seleksi/peningkatan mesin berdasarkan korpus jurnal kedua arah, dengan penilaian istilah domain, hubungan sebab akibat, kuantor, negasi, asosiasi nilai, dan kelengkapan. Jalankan pemeriksaan kualitas dan percobaan pemulihan di belakang layar. Jangan menjadikan koreksi pengguna atas setiap blok sebagai definisi produk selesai. Menjaga hasil sumber ketika model gagal tetap lebih baik daripada mengarang, tetapi kondisi itu harus menjadi kegagalan terukur atau hasil parsial, bukan diterima sebagai keberhasilan penuh.

## ENG-03 — celah validator untuk satuan, aksen, dan asosiasi nilai

**Uji sintetis, bukan seluruhnya keluaran model:** semua pasangan di bawah menghasilkan `auditTranslation=[]` dan `semanticWarnings=[]`:

- `10 μL` → `10 nL`.
- `10 eV` → `10 keV`.
- `10 Gy` → `10 Sv`.
- `z̄` → `z` dalam kalimat rerata sampel.
- Tekanan sistolik/diastolik `120 and 80 mmHg, respectively` → `80 dan 120 mmHg`.
- `Treatment A reduced mortality by 10%` → `Perlakuan A meningkatkan mortalitas sebesar 10%`.

Penyebab: daftar UNIT eksplisit pada `semantic-spans.js:2–3`; aksen gabungan tidak tercakup daftar simbol; pemeriksa asosiasi hanya mencakup nama kelompok terbatas dan baru aktif pada dua identitas (`63–81`); angka dasar masih dibandingkan sebagai multiset (`translation.js:59–60`). Ini menunjukkan batas guard, bukan klaim bahwa semua satuan gagal atau model selalu menukar semua angka.

Kontrol masalah lama sekarang **terdeteksi**: `10 μM→10 mM`, `Ca2+→Ca3+`, `∅→å`, dan pertukaran dosis kelompok A/B 10/20 mg. Jadi ada kemajuan yang nyata, tetapi cakupannya belum cukup luas untuk klaim jurnal umum.

## ENG-04 — P2: false reject dan judul kapital menambah pekerjaan pengguna

Input aktual `Treatment A reduced mortality by 10%, whereas treatment B increased mortality by 20%.` menghasilkan kandidat `Pengobatan A mengurangi kematian oleh 10%, sedangkan pengobatan B meningkatkan kematian oleh 20%.` yang mempertahankan kelompok, arah, dan angka. Validator menolaknya karena `pengobatan` tidak terdapat dalam `kindWords` (`semantic-spans.js:65`); sumber Inggris dipertahankan dan pengguna diminta mencoba ulang/meninjau. Pilihan kata kandidat masih dapat diperbaiki, tetapi tuduhan bahwa asosiasi nilai berubah adalah false positive untuk kasus ini.

Judul `ELASTIC NET REGULARIZATION` tetap persis dalam bahasa Inggris dengan status review, karena kata kapital yang tidak ada di daftar dipertahankan (`semantic-spans.js:91–94`, `translation.js:94,174`). Perlindungan ambigu ini disengaja dan diberi tanda; jangan menyebutnya korupsi diam-diam. Namun produk masih membutuhkan intervensi pada judul ilmiah yang lazim kapital. Penguatan harus berupa disambiguasi otomatis dan terminology-aware retry yang terbatas, bukan mewajibkan pengguna membuat glosarium untuk mendapatkan hasil dasar.

## Perbaikan CP17 yang terkonfirmasi

- `CLIMATE CHANGE` → `Perubahan iklim`.
- `KAJIAN PUSTAKA` → `Literature review`.
- `Regresi linear mengestimasi ukuran efek.` → `Linear regression estimates effect size.`.
- `No real number satisfies the inequality. Solution set: ∅` tetap membawa ∅ dan istilah himpunan penyelesaian.
- Formula mandiri `|𝑥−4| < 1` serta ID terstruktur `absolute-value-inequalities~challenge~07` dipertahankan utuh.
- Empat mutasi kontrol satuan/ion/∅/kelompok ditolak validator.
- Status rejected/failed terpisah, diagnostik internal terpisah dari pesan pengguna, dan kegagalan mempertahankan sumber. `main.js:417–419` memisahkan needs-attention dari complete; ini lebih jujur daripada menghitung semua blok tersentuh sebagai terjemahan sukses.

## Berkas bukti

- `real-model-probe.mjs`: jalankan tanpa argumen untuk 28 kasus, `--notation` untuk 6 kontrol turunan.
- `real-model-results.json`: keluaran lengkap 28 kasus dan metadata engine.
- `notation-model-results.json`: 6 kontrol matematika aktual.
- `validator-probe.mjs`, `validator-results.json`: 12 uji guard.
- Kedua log konsol menyimpan keluaran untuk reproduksi; SHA worker asli juga terekam dalam hasil.

Perintah berjalan dari folder mana pun dengan Node 24, setelah sumber tetap berada pada posisi relatif `../../source/r/7a8e787a497535f5`. Skrip membuat worker bridge sementara lalu menghapusnya; sumber aplikasi tidak ditulis ulang. Cache probe RAM pada pengujian hanya mengemulasi persistensi API dan **tidak membuktikan offline browser**. Tidak ada data dokumen dikirim ke jaringan oleh bridge pengujian.
