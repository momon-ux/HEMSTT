# Pelayan HEMSTT (Google Apps Script)

Bahagian ini ialah pelayan data HEMSTT. Ia sengaja diasingkan daripada paparan GitHub Pages supaya kod pentadbir dan kata laluan tidak boleh dibaca daripada laman awam.

## Tetapan pertama

1. Buka `script.google.com` dan cipta projek baharu bernama **HEMSTT Server**.
2. Salin kandungan `Code.gs` dan `appsscript.json` ke projek tersebut.
3. Buka **Project Settings → Script Properties** dan tambah:
   - `SUPER_ADMIN_CODE` — kod pentadbir utama yang telah dipersetujui.
   - `TEMP_SCHOOL_PASSWORD` — kata laluan sementara sekolah yang telah dipersetujui.
4. Jalankan fungsi `setupHemstt()` sekali dan benarkan akses Google Sheets/Drive.
5. Pilih **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL yang berakhir dengan `/exec` ke `docs/config.js`.
7. Selepas kemas kini kod pelayan, gunakan **Deploy → Manage deployments → Edit → New version**.

## Keselamatan

- Kod induk tidak disimpan dalam fail GitHub.
- Kata laluan sekolah disimpan sebagai cap keselamatan berserta garam unik.
- Sesi tamat selepas 12 jam.
- Pentadbir sekolah hanya mendapat data `schoolId` sendiri.
- Kata laluan sementara wajib ditukar semasa log masuk pertama.
- Aktiviti penting direkodkan dalam helaian `audit`.
