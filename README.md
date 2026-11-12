# HEMSTT

HEMSTT ialah platform pengurusan HEM multi-sekolah yang menggunakan:

- **GitHub Pages (`momon-ux`)** untuk paparan pengguna.
- **Google Apps Script** untuk log masuk dan operasi pelayan.
- **Google Sheets** sebagai pangkalan data induk.
- **Google Drive** untuk logo dan fail sekolah.

Data SK Ranggu dalam HEM SmartTrack asal tidak disentuh. HEMSTT menggunakan pangkalan data dan pelayan baharu.

## Struktur

- `docs/` — laman yang akan diterbitkan melalui GitHub Pages.
- `apps-script/` — kod pelayan Google Apps Script.
- `app/` — prototaip reka bentuk terdahulu, dikekalkan sebagai rujukan pembangunan.

## Urutan penerbitan

1. Siapkan Google Apps Script mengikut panduan `apps-script/README.md`.
2. Tampal URL Web App ke `docs/config.js`.
3. Terbitkan GitHub Pages daripada folder `/docs` pada cabang utama.

Kod keselamatan pentadbir tidak boleh dimasukkan ke dalam `docs/` atau mana-mana fail GitHub awam.
