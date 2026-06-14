# SurveyDash — Product Requirements Document

**Versi:** 1.0.0
**Tanggal:** April 2026
**Status:** Draft – For Review
**Referensi:** SKM BPBD Kota Tangerang Selatan 2026

---

## 1. Executive Summary

SurveyDash adalah platform dashboard berbasis web yang dirancang untuk pemaparan hasil survei di lingkungan pemerintahan. Platform ini membaca data dari Google Forms secara otomatis melalui Google Apps Script dan menampilkannya dalam visualisasi interaktif berbasis Next.js.

**Tiga pilar utama:**
- **Data Layer** — Google Forms → Google Sheets (auto-populated)
- **API Layer** — Google Apps Script Web App (middleware JSON)
- **Frontend Layer** — Next.js App Router (dashboard interaktif)

Penambahan survei baru cukup dilakukan dengan mendaftarkan URL Google Apps Script — tanpa deployment baru.

---

## 2. Problem Statement

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | Rekap data manual dari Google Sheets ke Excel | Delay pelaporan, rentan human error |
| 2 | Setiap survei baru dibuat file terpisah | Tidak ada sentralisasi, sulit dikelola |
| 3 | Hasil survei tidak bisa diakses real-time | Pimpinan tidak bisa pantau perkembangan |
| 4 | Tidak ada kontrol akses | Risiko kebocoran data responden |
| 5 | Visualisasi dibuat ulang setiap paparan | Tidak efisien, inkonsisten desain |

> **Contoh nyata:** SKM BPBD Kota Tangerang Selatan Triwulan I 2026 memiliki 9 indikator IKM + 2 bagian open-ended yang saat ini harus diolah manual sebelum bisa dipresentasikan.

---

## 3. Goals & Objectives

### 3.1 Goals Utama
- Satu platform terpusat untuk seluruh survei pemerintahan
- Otomatisasi pembacaan data via Google Apps Script
- Dashboard siap papar tanpa rekap manual
- Login system — hanya personel tertentu yang bisa akses
- Onboarding survei baru hanya dengan satu URL script

### 3.2 Key Success Metrics

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Waktu onboarding survei baru | < 5 menit | Dari URL didaftarkan → data muncul |
| Pengurangan waktu rekap manual | > 80% | Perbandingan sebelum vs sesudah |
| Jumlah survei aktif | Tidak terbatas | Pagination |
| Uptime platform | > 99% | Monitoring |
| Waktu load dashboard | < 3 detik | Core Web Vitals |

---

## 4. User Personas

### Super Admin
- **Siapa:** Tim analis survei / konsultan pemerintah
- **Akses:** Full — tambah/hapus survei, kelola user, lihat semua data
- **Kebutuhan:** Daftarkan survei baru cepat, pantau semua survei aktif
- **Pain point:** Rekap manual tiap survei, buat slide ulang setiap paparan

### Viewer / Pimpinan
- **Siapa:** Kepala dinas, pimpinan instansi, tim manajemen
- **Akses:** Read-only — hanya survei yang di-assign
- **Kebutuhan:** Ringkasan hasil survei visual dan cepat
- **Pain point:** Harus tunggu laporan tim, data tidak real-time

---

## 5. Features & Functional Requirements

### 5.1 Autentikasi & Akses (RBAC)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| AUTH-01 | Login dengan email & password | P0 |
| AUTH-02 | JWT di httpOnly cookie, auto-expire 8 jam | P0 |
| AUTH-03 | Role: Super Admin (full access) | P0 |
| AUTH-04 | Role: Viewer (read-only, survei tertentu) | P0 |
| AUTH-05 | Manajemen user (tambah, edit, nonaktifkan) | P1 |
| AUTH-06 | Assign survei ke user tertentu | P1 |

### 5.2 Manajemen Survei

| ID | Fitur | Prioritas |
|----|-------|-----------|
| SURV-01 | Daftarkan survei baru (nama, instansi, periode, URL script) | P0 |
| SURV-02 | Validasi URL script saat pendaftaran | P0 |
| SURV-03 | List semua survei aktif + status + jumlah responden | P0 |
| SURV-04 | Edit / nonaktifkan survei | P1 |
| SURV-05 | Auto-refresh data setiap 30 menit | P1 |
| SURV-06 | Tombol manual refresh | P1 |

### 5.3 Dashboard & Visualisasi

| ID | Fitur | Prioritas |
|----|-------|-----------|
| DASH-01 | Summary cards: total responden, IKM, mutu, periode | P0 |
| DASH-02 | Bar/radar chart per indikator (klik untuk expand) | P0 |
| DASH-03 | Distribusi jawaban per pertanyaan + highlight terbanyak | P0 |
| DASH-04 | Tabel rekap nilai rata-rata per indikator | P0 |
| DASH-05 | Visualisasi demografi (jenis kelamin, pendidikan, usia) | P0 |
| DASH-06 | Filter berdasarkan jenis layanan | P1 |
| DASH-07 | Tampilan open-ended / harapan publik | P1 |
| DASH-08 | Trend antar periode (line chart) | P2 |
| DASH-09 | Export PDF | P2 |
| DASH-10 | Dark mode toggle | P1 |

---

## 6. Arsitektur Teknis

### 6.1 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Auth | NextAuth.js + JWT |
| API Middleware | Google Apps Script Web App |
| Data Source | Google Sheets (via Google Forms) |
| State / Cache | React Query (TanStack Query) |
| Deployment | Vercel |

### 6.2 Data Flow

```
Google Form (responden submit)
    ↓
Google Sheets (auto-populate)
    ↓
Google Apps Script Web App
    ↓  GET /exec → JSON
Next.js Server Component
    ↓
Dashboard UI (React)
```

### 6.3 Kontrak JSON Google Apps Script

Setiap survei harus mengimplementasikan endpoint `GET https://script.google.com/macros/s/{ID}/exec` yang mengembalikan:

```json
{
  "meta": {
    "survey_name": "SKM BPBD Kota Tangerang Selatan",
    "period": "Triwulan I 2026",
    "total_respondents": 412,
    "last_updated": "2026-04-22T10:30:00Z"
  },
  "ikm": {
    "score": 82.5,
    "category": "B",
    "label": "Baik"
  },
  "indicators": [
    {
      "id": 1,
      "label": "Persyaratan",
      "avg": 3.2,
      "distribution": [5, 12, 180, 215]
    }
  ],
  "demographics": {
    "gender": { "Laki-laki": 210, "Perempuan": 202 },
    "education": { "SMA": 120, "D3": 80, "S1": 180, "S2": 32 }
  },
  "open_ended": {
    "general_opinion": ["Pelayanan sudah baik", "..."],
    "expectations": ["Perlu ditingkatkan responsivitas", "..."]
  }
}
```

**Template Apps Script minimal:**

```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // proses data sesuai kontrak JSON di atas
  const result = buildResult(data);
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

> **Catatan:** Dashboard graceful degrade — field yang tidak ada ditampilkan sebagai "Data tidak tersedia".

---

## 7. UI/UX Requirements

### 7.1 Halaman & Route

| Halaman | Route | Akses |
|---------|-------|-------|
| Login | `/login` | Public |
| Survey List | `/dashboard` | Semua user |
| Detail Survei | `/dashboard/[id]` | Semua user |
| Admin Survei | `/admin/surveys` | Super Admin |
| Admin User | `/admin/users` | Super Admin |
| Tambah Survei | `/admin/surveys/new` | Super Admin |

### 7.2 Komponen Dashboard Detail

1. **Header** — nama survei, instansi, periode, tombol refresh + dark mode toggle
2. **Summary Cards** — Total Responden · Nilai IKM · Kategori · Periode
3. **Pertanyaan IKM** — list pertanyaan yang bisa di-klik untuk expand:
   - Distribusi 4 jawaban dengan progress bar animasi
   - Badge "TERBANYAK" pada jawaban dengan persentase tertinggi
   - Rata-rata skor per indikator
4. **Demografi** — donut chart gender, bar chart pendidikan/pekerjaan
5. **Harapan Publik** — list jawaban open-ended yang dapat di-scroll
6. **Filter** — sidebar filter jenis layanan

---

## 8. Non-Functional Requirements

| Kategori | Requirement | Target |
|----------|-------------|--------|
| Performance | LCP dashboard | < 3 detik |
| Performance | Fetch dari Apps Script | < 5 detik |
| Security | Semua route diproteksi JWT | 100% |
| Security | Token di httpOnly cookie | Tidak accessible via JS |
| Security | CORS whitelist domain | Hanya domain terdaftar |
| Scalability | Jumlah survei | Tidak terbatas (pagination) |
| Reliability | Graceful error saat Apps Script down | Cache + pesan error |
| Compatibility | Browser support | 2 versi terakhir semua browser modern |
| Responsiveness | Mobile / tablet | Dashboard terbaca di semua ukuran layar |

---

## 9. Data Model

### Entitas (disimpan di backend Next.js)

**User**
```
id            UUID (PK)
email         String (unique)
password_hash String (bcrypt)
role          Enum: SUPER_ADMIN | VIEWER
is_active     Boolean
created_at    DateTime
```

**Survey**
```
id             UUID (PK)
name           String
agency         String
period         String
script_url     String
is_active      Boolean
last_fetched   DateTime
created_at     DateTime
```

**UserSurvey** (many-to-many)
```
user_id    UUID (FK)
survey_id  UUID (FK)
```

---

## 10. Rencana Implementasi

| Phase | Scope | Estimasi |
|-------|-------|----------|
| Phase 0 – Foundation | Setup Next.js, TypeScript, Tailwind, shadcn, DB | 3 hari |
| Phase 1 – Auth | Login, JWT, NextAuth, RBAC, middleware | 4 hari |
| Phase 2 – Survey Mgmt | Admin CRUD survei, form daftar survei, kelola user | 5 hari |
| Phase 3 – Dashboard Core | Fetch Apps Script, summary cards, chart IKM, tabel | 7 hari |
| Phase 4 – Full Dashboard | Demografi, open-ended, filter jenis layanan, dark mode | 5 hari |
| Phase 5 – Polish & Deploy | Error handling, loading states, mobile, deploy Vercel | 4 hari |

**Total estimasi: ±28 hari kerja** (tidak termasuk UAT dan revisi)

---

## 11. Out of Scope (v1.0)

- Pembuatan Google Forms / Sheets (diasumsikan sudah ada)
- Deployment Google Apps Script (dilakukan tim survei)
- Analisis teks otomatis / sentiment analysis
- Integrasi langsung Google Drive API
- Notifikasi email / WhatsApp
- Multi-bahasa (v1.0 hanya Bahasa Indonesia)
- Audit log / history perubahan

---

## 12. Asumsi & Dependensi

- Setiap survei sudah memiliki Google Form + Sheets aktif
- Tim survei mampu deploy Google Apps Script Web App
- Script di-set: *Execute as: Me* · *Who has access: Anyone*
- Data Sheets tidak dimodifikasi manual (hanya dari Form responses)

---

## 13. Open Questions

| # | Pertanyaan | Owner | Status |
|---|-----------|-------|--------|
| Q1 | Cache data di backend atau selalu fetch langsung ke Apps Script? | Tech Lead | Open |
| Q2 | Database: SQLite (simpel) atau Postgres (production)? | Tech Lead | Open |
| Q3 | Export PDF masuk v1.0 atau v1.1? | Product Owner | Open |
| Q4 | Berapa concurrent users yang perlu di-support? | Stakeholder | Open |
| Q5 | Perlu SSO dengan sistem pemerintah yang sudah ada? | Stakeholder | Open |

---

## Appendix: Referensi Kuesioner SKM BPBD 2026

Dasar hukum: **Permen PAN-RB No. 14 Tahun 2017**

### Bagian A — 9 Indikator IKM (Skala 1–4)

| No | Indikator | Jawaban (1→4) |
|----|-----------|---------------|
| 1 | Persyaratan | Tidak Sesuai → Sangat Sesuai |
| 2 | Sistem, Mekanisme & Prosedur | Tidak Mudah → Sangat Mudah |
| 3 | Waktu Penyelesaian | Tidak Cepat → Sangat Cepat |
| 4 | Biaya / Tarif | Sangat Mahal → Gratis |
| 5 | Produk Spesifikasi Pelayanan | Tidak Sesuai → Sangat Sesuai |
| 6 | Kompetensi Pelaksana | Tidak Kompeten → Sangat Kompeten |
| 7 | Perilaku Pelaksana | Tidak Sopan → Sangat Sopan & Ramah |
| 8 | Penanganan Pengaduan | Tidak Ada → Dikelola dengan Baik |
| 9 | Sarana & Prasarana | Buruk → Sangat Baik |

### Bagian B — Harapan Publik (Open-ended)
- B1: Pendapat umum responden terhadap pelayanan BPBD
- B2: Harapan responden kepada BPBD

---

*PRD ini dibuat sebagai panduan pengembangan SurveyDash v1.0. Revisi dokumen dilakukan bersama Product Owner setelah review stakeholder.*
