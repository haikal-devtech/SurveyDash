import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Proxy actions to Google Apps Script (fill sheet, etc.)
  app.post("/api/survey-action", async (req, res) => {
    const { scriptUrl, action } = req.body as { scriptUrl?: string; action?: string };

    if (!scriptUrl || !action) {
      return res.status(400).json({ error: "scriptUrl dan action wajib diisi" });
    }

    // Handle demo mode — simulate success without hitting GAS
    if (scriptUrl === "demo") {
      return res.json({ success: true, message: `Demo: aksi "${action}" berhasil disimulasikan.` });
    }

    try {
      new URL(scriptUrl);
    } catch {
      return res.status(400).json({ error: "Format URL tidak valid" });
    }

    try {
      const sep = scriptUrl.includes("?") ? "&" : "?";
      const response = await axios.get(`${scriptUrl}${sep}action=${encodeURIComponent(action)}`, {
        timeout: 30000,
      });
      return res.json(response.data);
    } catch (error: any) {
      console.error(`survey-action [${action}] error:`, error.message);
      return res.status(500).json({ error: "Aksi gagal dijalankan", details: error.message });
    }
  });

  // API Route: Proxy to Google Apps Script
  app.get("/api/survey-data", async (req, res) => {
    let { scriptUrl, mode } = req.query as { scriptUrl?: string; mode?: string };

    if (!scriptUrl || typeof scriptUrl !== "string") {
      return res.status(400).json({ error: "Script URL is missing or invalid" });
    }

    scriptUrl = scriptUrl.trim();
    const presentationMode = mode === "presentation";

    if (scriptUrl === "demo") {
      const demoData = {
        meta: {
          survey_name: "DEMO: Survei Kepemimpinan Nasional & Elektoral Pilpres 2029",
          period: "14–23 Juni 2026",
          total_respondents: 2045,
          last_updated: new Date().toISOString(),
          sample_validity: "96.2%",
          data_mode: "demo",
          margin_of_error: "±2.17%",
          confidence_level: 95,
        },
        ikm: {
          score: 67.8,
          category: "CUKUP BAIK",
          label: "C",
          interval: "65,00–76,60",
          gap: 2.2,
        },
        indicators: [
          { id: 1, label: "Pelayanan Publik", avg: 2.80, distribution: [82, 410, 1024, 529] },
          { id: 2, label: "Ekonomi & Lapangan Kerja", avg: 2.36, distribution: [512, 614, 614, 305] },
          { id: 3, label: "Infrastruktur", avg: 2.88, distribution: [61, 370, 1024, 590] },
          { id: 4, label: "Tanggap Bencana", avg: 2.60, distribution: [164, 512, 880, 489] },
          { id: 5, label: "Pendidikan & SDM", avg: 2.72, distribution: [123, 450, 960, 512] },
          { id: 6, label: "Lingkungan & Hutan", avg: 2.20, distribution: [614, 716, 512, 203] },
          { id: 7, label: "Pertahanan & HAM", avg: 2.84, distribution: [82, 390, 1024, 549] },
          { id: 8, label: "Ketahanan Pangan", avg: 2.52, distribution: [204, 550, 880, 411] },
          { id: 9, label: "Demokrasi & Politik", avg: 2.44, distribution: [307, 614, 776, 348] },
          { id: 10, label: "Pajak & Keuangan", avg: 2.40, distribution: [370, 614, 716, 345] },
        ],
        demographics: {
          gender: { "Laki-laki": 1043, "Perempuan": 1002 },
          education: {
            "SMA / Sederajat": 1024,
            "Sarjana (S1)": 511,
            "Diploma (D1-D4)": 246,
            "SMP / Sederajat": 164,
            "Pascasarjana (S2/S3)": 61,
            "SD / Sederajat": 39,
          },
          umur: {
            "17-25 tahun": 307,
            "26-35 tahun": 614,
            "36-45 tahun": 716,
            "46-55 tahun": 307,
            "56-65 tahun": 82,
            "66+ tahun": 19,
          },
          pekerjaan: {
            "Karyawan Swasta": 614,
            "Wiraswasta": 512,
            "PNS / ASN / BUMN": 204,
            "Buruh / Pekerja Lepas": 246,
            "Petani / Nelayan": 205,
            "Ibu Rumah Tangga": 164,
            "Mahasiswa / Pelajar": 61,
            "Tidak Bekerja": 39,
          },
          location: {
            "Jawa Barat": 368,
            "Jawa Timur": 307,
            "Jawa Tengah": 286,
            "Sumatera Utara": 123,
            "Banten": 102,
            "Daerah Khusus Jakarta": 82,
            "Sulawesi Selatan": 82,
            "Lampung": 61,
            "Riau": 61,
            "Lainnya": 573,
          },
          suku: {
            "Jawa": 818,
            "Sunda": 307,
            "Batak": 102,
            "Betawi": 102,
            "Minangkabau": 82,
            "Bugis": 61,
            "Madura": 82,
            "Lainnya": 491,
          },
        },
        open_ended: {
          general_opinion: [
            "Kondisi kepemimpinan nasional cukup stabil, pembangunan infrastruktur terus berlanjut.",
            "Presiden Prabowo menunjukkan kepemimpinan tegas dalam hubungan internasional.",
            "Ekonomi rakyat kecil masih perlu perhatian lebih, harga-harga masih tinggi.",
            "Kepemimpinan nasional perlu lebih memerhatikan sektor pendidikan dan kesehatan.",
            "Saya puas dengan arah kebijakan pemerintah, terutama dalam hal pertahanan.",
            "Perlu pemimpin yang lebih merakyat dan memahami masalah di daerah.",
            "Hilirisasi sumber daya alam adalah langkah tepat untuk masa depan.",
            "Pemberantasan korupsi masih belum terasa hasilnya bagi masyarakat biasa.",
            "Infrastruktur di daerah kami sudah jauh lebih baik dari sebelumnya.",
            "Pemimpin ke depan harus lebih fokus pada penciptaan lapangan kerja.",
          ],
          expectations: [
            "Harapannya pemimpin ke depan bisa menurunkan harga bahan pokok.",
            "Semoga Indonesia punya pemimpin yang benar-benar anti-korupsi.",
            "Perlu pemimpin yang bisa mempersatukan semua golongan.",
            "Harap fokus pada pendidikan berkualitas untuk generasi muda.",
            "Kesejahteraan petani dan nelayan harus menjadi prioritas utama.",
            "Pemimpin yang dipilih harus bisa membawa Indonesia maju di kancah global.",
            "Tolong perhatikan infrastruktur di daerah terpencil.",
            "Semoga demokrasi kita semakin sehat dan bebas dari politik uang.",
          ],
        },
        respondents: Array.from({ length: 50 }, (_, i) => {
          const names = [
            "Ahmad Fauzi","Siska Pertiwi","Bambang Wijaya","Lestari Putri","Andi Pratama",
            "Diana Sari","Eko Prasetyo","Fitri Handayani","Guruh Soekarno","Hana Pertiwi",
            "Indra Jaya","Juliana Santoso","Kurnia Sandi","Lucky Hakim","Maya Septha",
            "Nanda Arsyad","Oki Setiana","Putri Marino","Reza Ramadhan","Rizky Billar",
            "Slamet Riyadi","Taufik Hidayat","Utomo Wibowo","Vina Panduwinata","Wahyu Santosa",
            "Yanti Susilo","Zainal Arifin","Budi Santoso","Candra Kirana","Dedi Mulyono",
            "Eka Wahyuni","Fajar Prasetyo","Ghani Ibrahim","Harun Nasution","Irma Suryani",
            "Jefri Simbolon","Kartika Sari","Lukman Hakim","Mulyadi Santoso","Nani Susilowati",
            "Oman Faturohman","Purnomo Sidhi","Qodir Jaelani","Rita Sulistyowati","Syahrul Gunawan",
            "Tri Wulandari","Udin Waluyo","Vika Rahayu","Wawan Setiawan","Yuli Andriani",
          ];
          const provs = ["Jawa Barat","Jawa Timur","Jawa Tengah","Sumatera Utara","Banten","DKI Jakarta","Sulawesi Selatan","Lampung"];
          const surveyors = ["Budi Santoso","Siti Aminah","Ahmad Fauzi","Dewi Lestari","Rian Hidayat","Fitri Handayani"];
          const edus = ["SMA / Sederajat","Sarjana (S1)","Diploma (D1-D4)","Pascasarjana (S2/S3)"];
          return {
            id: `R${String(i + 1).padStart(4, "0")}`,
            name: names[i] || `Responden ${i + 1}`,
            timestamp: new Date(Date.now() - Math.random() * 86400000 * 9).toISOString(),
            gender: i % 3 === 0 ? "Perempuan" : "Laki-laki",
            education: edus[i % 4],
            location: provs[i % provs.length],
            province: provs[i % provs.length],
            surveyor: surveyors[i % surveyors.length],
            score_average: Math.floor(Math.random() * 4) + 6,
            answers: {
              "Persyaratan": Math.floor(Math.random() * 2) + 3,
              "Prosedur": Math.floor(Math.random() * 3) + 2,
            },
          };
        }),
        candidate_preference: {
          capres: [
            { name: "Prabowo Subianto", count: 921, percentage: 45.0 },
            { name: "Anies Baswedan", count: 410, percentage: 20.0 },
            { name: "Dedi Mulyadi", count: 348, percentage: 17.0 },
            { name: "Agus Harimurti Yudhoyono", count: 184, percentage: 9.0 },
            { name: "Khofifah Indar Parawansa", count: 102, percentage: 5.0 },
            { name: "Tidak Tahu / Belum Memutuskan", count: 80, percentage: 3.9 },
          ],
          capres_alternative: [
            { name: "Dedi Mulyadi", count: 512, percentage: 25.0 },
            { name: "Anies Baswedan", count: 410, percentage: 20.0 },
            { name: "Erick Thohir", count: 307, percentage: 15.0 },
            { name: "Sri Mulyani", count: 256, percentage: 12.5 },
            { name: "Sudirman Said", count: 204, percentage: 10.0 },
            { name: "Purbaya Yudhi Sadewa", count: 153, percentage: 7.5 },
          ],
          capres_closed: [
            { name: "Prabowo Subianto", count: 860, percentage: 42.0 },
            { name: "Anies Baswedan", count: 450, percentage: 22.0 },
            { name: "Dedi Mulyadi", count: 390, percentage: 19.0 },
            { name: "Agus Harimurti Yudhoyono", count: 185, percentage: 9.0 },
            { name: "Lainnya", count: 82, percentage: 4.0 },
            { name: "Tidak Tahu / Golput", count: 78, percentage: 3.8 },
          ],
          simulation_10: [
            { name: "Prabowo Subianto", count: 880, percentage: 43.0 },
            { name: "Anies Baswedan", count: 430, percentage: 21.0 },
            { name: "Dedi Mulyadi", count: 370, percentage: 18.1 },
            { name: "Agus Harimurti Yudhoyono", count: 175, percentage: 8.6 },
            { name: "Erick Thohir", count: 82, percentage: 4.0 },
            { name: "Khofifah Indar Parawansa", count: 61, percentage: 3.0 },
            { name: "Puan Maharani", count: 20, percentage: 1.0 },
            { name: "Lainnya", count: 27, percentage: 1.3 },
          ],
          simulation_8: [
            { name: "Prabowo Subianto", count: 900, percentage: 44.0 },
            { name: "Anies Baswedan", count: 450, percentage: 22.0 },
            { name: "Dedi Mulyadi", count: 390, percentage: 19.0 },
            { name: "Agus Harimurti Yudhoyono", count: 185, percentage: 9.0 },
            { name: "Erick Thohir", count: 82, percentage: 4.0 },
            { name: "Lainnya", count: 38, percentage: 1.9 },
          ],
          simulation_5: [
            { name: "Prabowo Subianto", count: 960, percentage: 46.9 },
            { name: "Anies Baswedan", count: 470, percentage: 23.0 },
            { name: "Dedi Mulyadi", count: 410, percentage: 20.0 },
            { name: "Agus Harimurti Yudhoyono", count: 163, percentage: 8.0 },
            { name: "Tidak Tahu", count: 42, percentage: 2.1 },
          ],
          politisi: [
            { name: "Prabowo Subianto", count: 850, percentage: 41.6 },
            { name: "Anies Baswedan", count: 420, percentage: 20.5 },
            { name: "Agus Harimurti Yudhoyono", count: 310, percentage: 15.2 },
            { name: "Puan Maharani", count: 175, percentage: 8.6 },
            { name: "Muhaimin Iskandar", count: 102, percentage: 5.0 },
          ],
          tokoh: [
            { name: "Dedi Mulyadi", count: 650, percentage: 31.8 },
            { name: "Sudirman Said", count: 390, percentage: 19.1 },
            { name: "Khofifah Indar Parawansa", count: 360, percentage: 17.6 },
            { name: "Sri Mulyani", count: 295, percentage: 14.4 },
            { name: "Andika Perkasa", count: 205, percentage: 10.0 },
          ],
          profesional: [
            { name: "Sri Mulyani", count: 580, percentage: 28.4 },
            { name: "Purbaya Yudhi Sadewa", count: 410, percentage: 20.0 },
            { name: "Erick Thohir", count: 360, percentage: 17.6 },
            { name: "Muhamad Chatib Basri", count: 250, percentage: 12.2 },
            { name: "Wishnutama", count: 130, percentage: 6.4 },
          ],
          parpol: [
            { name: "PDI Perjuangan", count: 340, percentage: 16.6 },
            { name: "Partai Gerindra", count: 308, percentage: 15.1 },
            { name: "Partai Golkar", count: 256, percentage: 12.5 },
            { name: "PKB", count: 205, percentage: 10.0 },
            { name: "Partai NasDem", count: 185, percentage: 9.0 },
            { name: "Partai Demokrat", count: 155, percentage: 7.6 },
            { name: "PKS", count: 143, percentage: 7.0 },
            { name: "PAN", count: 112, percentage: 5.5 },
          ],
          parpol_closed: [
            { name: "PDI Perjuangan", count: 360, percentage: 17.6 },
            { name: "Partai Gerindra", count: 328, percentage: 16.0 },
            { name: "Partai Golkar", count: 266, percentage: 13.0 },
            { name: "PKB", count: 215, percentage: 10.5 },
            { name: "Partai NasDem", count: 195, percentage: 9.5 },
            { name: "Partai Demokrat", count: 163, percentage: 8.0 },
            { name: "PKS", count: 150, percentage: 7.3 },
            { name: "PAN", count: 120, percentage: 5.9 },
            { name: "Tidak Tahu / Golput", count: 248, percentage: 12.1 },
          ],
        },
        question_analysis: {
          national_leadership: {
            kondisi_kepemimpinan_opini: [
              { name: "Cukup baik, pembangunan infrastruktur terasa.", count: 246, percentage: 12.0 },
              { name: "Perlu lebih banyak perhatian untuk rakyat kecil.", count: 204, percentage: 9.9 },
              { name: "Pemerintah sudah bekerja keras, hasilnya mulai terasa.", count: 185, percentage: 9.0 },
              { name: "Masih banyak yang perlu diperbaiki, terutama ekonomi.", count: 163, percentage: 7.9 },
              { name: "Kepemimpinan nasional sudah di jalur yang benar.", count: 143, percentage: 7.0 },
            ],
            kepuasan_kepemimpinan_skala: [
              { name: "Sangat Puas (9–10)", count: 80, percentage: 3.9 },
              { name: "Puas (7–8)", count: 962, percentage: 47.0 },
              { name: "Cukup (5–6)", count: 921, percentage: 45.0 },
              { name: "Tidak Puas (≤4)", count: 82, percentage: 4.0 },
            ],
            optimisme_pemimpin_masa_depan: [
              { name: "Sangat Optimis (9–10)", count: 184, percentage: 9.0 },
              { name: "Optimis (7–8)", count: 1084, percentage: 53.0 },
              { name: "Biasa Saja (5–6)", count: 716, percentage: 35.0 },
              { name: "Pesimis (≤4)", count: 61, percentage: 3.0 },
            ],
            masalah_utama_bangsa: [
              { name: "Lapangan kerja / Pengangguran", count: 920, percentage: 45.0 },
              { name: "Harga kebutuhan pokok", count: 840, percentage: 41.1 },
              { name: "Kemiskinan", count: 720, percentage: 35.2 },
              { name: "Korupsi", count: 650, percentage: 31.8 },
              { name: "Pendidikan berkualitas", count: 540, percentage: 26.4 },
              { name: "Kesehatan masyarakat", count: 450, percentage: 22.0 },
            ],
            opini_kebijakan_prabowo: [
              { name: "Kebijakan hilirisasi sumber daya alam sudah tepat.", count: 512, percentage: 25.0 },
              { name: "Tegas dalam kebijakan pertahanan dan keamanan nasional.", count: 430, percentage: 21.0 },
              { name: "Perlu lebih memperhatikan sektor ekonomi rakyat kecil.", count: 368, percentage: 18.0 },
              { name: "Program makan bergizi gratis sangat membantu masyarakat.", count: 307, percentage: 15.0 },
              { name: "Kebijakan luar negeri sudah menunjukkan kepemimpinan kuat.", count: 246, percentage: 12.0 },
              { name: "Masih perlu konsistensi antara janji dan realisasi program.", count: 182, percentage: 8.9 },
            ],
            kriteria_pemimpin_ideal: [
              { name: "Jujur, tegas, dan berintegritas tinggi.", count: 614, percentage: 30.0 },
              { name: "Memahami ekonomi dan mampu mensejahterakan rakyat.", count: 512, percentage: 25.0 },
              { name: "Berpengalaman tapi tetap merakyat dan dekat rakyat.", count: 430, percentage: 21.0 },
              { name: "Visioner dan berani membuat terobosan.", count: 307, percentage: 15.0 },
              { name: "Berani memberantas korupsi tanpa pandang bulu.", count: 182, percentage: 8.9 },
            ],
            tidak_suka_pemimpin: [
              { name: "Terlalu banyak janji kampanye yang tidak direalisasikan.", count: 716, percentage: 35.0 },
              { name: "Korupsi dan nepotisme yang masih marak.", count: 614, percentage: 30.0 },
              { name: "Kurang perhatian terhadap rakyat miskin dan daerah terpencil.", count: 450, percentage: 22.0 },
              { name: "Gaya kepemimpinan yang elitis, kurang merakyat.", count: 265, percentage: 13.0 },
            ],
            harapan_pemimpin: [
              { name: "Fokus pada penciptaan lapangan kerja dan stabilitas harga pangan.", count: 820, percentage: 40.1 },
              { name: "Berantas korupsi secara nyata, bukan hanya retorika.", count: 614, percentage: 30.0 },
              { name: "Perhatikan pendidikan dan kesehatan masyarakat.", count: 512, percentage: 25.0 },
              { name: "Jaga persatuan bangsa dan hindari polarisasi.", count: 307, percentage: 15.0 },
              { name: "Perkuat ekonomi kerakyatan, bukan hanya konglomerat.", count: 265, percentage: 12.9 },
            ],
            karakter_pemimpin_dibutuhkan: [
              { name: "Jujur dan bersih dari korupsi", count: 1230, percentage: 60.1 },
              { name: "Mampu mengelola ekonomi", count: 980, percentage: 47.9 },
              { name: "Tegas dan berani", count: 870, percentage: 42.5 },
              { name: "Merakyat dan dekat dengan masyarakat", count: 760, percentage: 37.2 },
              { name: "Visioner", count: 640, percentage: 31.3 },
              { name: "Berpengalaman pemerintahan", count: 512, percentage: 25.0 },
            ],
            kebutuhan_tokoh_baru: [
              { name: "Perlu", count: 1085, percentage: 53.1 },
              { name: "Sangat Perlu", count: 410, percentage: 20.0 },
              { name: "Tidak Perlu", count: 307, percentage: 15.0 },
              { name: "Tidak Tahu", count: 243, percentage: 11.9 },
            ],
            asal_kalangan_pemimpin_ideal: [
              { name: "Kepala Daerah (Gubernur/Bupati)", count: 614, percentage: 30.0 },
              { name: "Menteri / Pejabat Negara", count: 409, percentage: 20.0 },
              { name: "Militer / TNI-Polri", count: 307, percentage: 15.0 },
              { name: "Akademisi / Teknokrat", count: 256, percentage: 12.5 },
              { name: "Pengusaha Profesional", count: 204, percentage: 10.0 },
              { name: "Tokoh Agama / Masyarakat", count: 153, percentage: 7.5 },
            ],
            tokoh_paling_layak: [
              { name: "Prabowo Subianto", count: 860, percentage: 42.1 },
              { name: "Anies Baswedan", count: 410, percentage: 20.0 },
              { name: "Dedi Mulyadi", count: 348, percentage: 17.0 },
              { name: "Agus Harimurti Yudhoyono", count: 184, percentage: 9.0 },
              { name: "Sudirman Said", count: 82, percentage: 4.0 },
              { name: "Tidak Tahu", count: 161, percentage: 7.9 },
            ],
            tokoh_alternatif: [
              { name: "Dedi Mulyadi", count: 512, percentage: 25.0 },
              { name: "Anies Baswedan", count: 390, percentage: 19.1 },
              { name: "Erick Thohir", count: 307, percentage: 15.0 },
              { name: "Sudirman Said", count: 246, percentage: 12.0 },
              { name: "Khofifah Indar Parawansa", count: 184, percentage: 9.0 },
            ],
            unggul_ekonomi: [
              { name: "Sri Mulyani", count: 580, percentage: 28.4 },
              { name: "Prabowo Subianto", count: 420, percentage: 20.5 },
              { name: "Erick Thohir", count: 360, percentage: 17.6 },
              { name: "Chatib Basri", count: 250, percentage: 12.2 },
              { name: "Purbaya Yudhi Sadewa", count: 185, percentage: 9.0 },
            ],
            unggul_pemberantasan_korupsi: [
              { name: "Sudirman Said", count: 510, percentage: 24.9 },
              { name: "Mahfud MD", count: 460, percentage: 22.5 },
              { name: "Anies Baswedan", count: 350, percentage: 17.1 },
              { name: "Abraham Samad", count: 220, percentage: 10.8 },
              { name: "KPK / Lembaga", count: 155, percentage: 7.6 },
            ],
            unggul_diplomasi_internasional: [
              { name: "Prabowo Subianto", count: 820, percentage: 40.1 },
              { name: "Retno Marsudi", count: 410, percentage: 20.0 },
              { name: "Anies Baswedan", count: 245, percentage: 12.0 },
              { name: "Sandiaga Uno", count: 163, percentage: 7.9 },
              { name: "Tidak Tahu", count: 407, percentage: 19.9 },
            ],
            unggul_pertahanan_keamanan: [
              { name: "Prabowo Subianto", count: 1230, percentage: 60.1 },
              { name: "Andika Perkasa", count: 410, percentage: 20.0 },
              { name: "Agus Harimurti Yudhoyono", count: 250, percentage: 12.2 },
              { name: "Tidak Tahu", count: 155, percentage: 7.6 },
            ],
            unggul_kesejahteraan_rakyat: [
              { name: "Dedi Mulyadi", count: 614, percentage: 30.0 },
              { name: "Anies Baswedan", count: 450, percentage: 22.0 },
              { name: "Khofifah Indar Parawansa", count: 360, percentage: 17.6 },
              { name: "Tri Rismaharini", count: 246, percentage: 12.0 },
              { name: "Tidak Tahu", count: 375, percentage: 18.3 },
            ],
          },
          leader_figures: {
            tokoh_paling_layak: [
              { name: "Prabowo Subianto", count: 860, percentage: 42.1 },
              { name: "Anies Baswedan", count: 410, percentage: 20.0 },
              { name: "Dedi Mulyadi", count: 348, percentage: 17.0 },
              { name: "Agus Harimurti Yudhoyono", count: 184, percentage: 9.0 },
              { name: "Sudirman Said", count: 82, percentage: 4.0 },
            ],
            unggul_ekonomi: [
              { name: "Sri Mulyani", count: 580, percentage: 28.4 },
              { name: "Prabowo Subianto", count: 420, percentage: 20.5 },
              { name: "Erick Thohir", count: 360, percentage: 17.6 },
              { name: "Chatib Basri", count: 250, percentage: 12.2 },
              { name: "Tidak Tahu", count: 435, percentage: 21.3 },
            ],
            unggul_korupsi: [
              { name: "Sudirman Said", count: 510, percentage: 24.9 },
              { name: "Mahfud MD", count: 460, percentage: 22.5 },
              { name: "Anies Baswedan", count: 350, percentage: 17.1 },
              { name: "Abraham Samad", count: 220, percentage: 10.8 },
              { name: "Tidak Tahu", count: 505, percentage: 24.7 },
            ],
            unggul_diplomasi: [
              { name: "Prabowo Subianto", count: 820, percentage: 40.1 },
              { name: "Retno Marsudi", count: 410, percentage: 20.0 },
              { name: "Anies Baswedan", count: 245, percentage: 12.0 },
              { name: "Tidak Tahu", count: 570, percentage: 27.9 },
            ],
            unggul_pertahanan: [
              { name: "Prabowo Subianto", count: 1230, percentage: 60.1 },
              { name: "Andika Perkasa", count: 410, percentage: 20.0 },
              { name: "Agus Harimurti Yudhoyono", count: 250, percentage: 12.2 },
              { name: "Tidak Tahu", count: 155, percentage: 7.6 },
            ],
            unggul_kesejahteraan: [
              { name: "Dedi Mulyadi", count: 614, percentage: 30.0 },
              { name: "Anies Baswedan", count: 450, percentage: 22.0 },
              { name: "Khofifah Indar Parawansa", count: 360, percentage: 17.6 },
              { name: "Tidak Tahu", count: 621, percentage: 30.4 },
            ],
            asal_kalangan_ideal: [
              { name: "Kepala Daerah (Gubernur/Bupati/Walikota)", count: 614, percentage: 30.0 },
              { name: "Menteri", count: 409, percentage: 20.0 },
              { name: "Militer / TNI", count: 307, percentage: 15.0 },
              { name: "Akademisi / Teknokrat", count: 256, percentage: 12.5 },
              { name: "Pengusaha Profesional", count: 204, percentage: 10.0 },
              { name: "Tokoh Agama", count: 153, percentage: 7.5 },
              { name: "Lainnya", count: 102, percentage: 5.0 },
            ],
          },
          presidential_electability: {
            capres_terbuka_b1a: [
              { name: "Prabowo Subianto", count: 921, percentage: 45.0 },
              { name: "Anies Baswedan", count: 410, percentage: 20.0 },
              { name: "Dedi Mulyadi", count: 348, percentage: 17.0 },
              { name: "Agus Harimurti Yudhoyono", count: 184, percentage: 9.0 },
              { name: "Khofifah Indar Parawansa", count: 102, percentage: 5.0 },
              { name: "Tidak Tahu", count: 80, percentage: 3.9 },
            ],
            capres_alternatif_b1b: [
              { name: "Dedi Mulyadi", count: 512, percentage: 25.0 },
              { name: "Anies Baswedan", count: 410, percentage: 20.0 },
              { name: "Erick Thohir", count: 307, percentage: 15.0 },
              { name: "Sri Mulyani", count: 256, percentage: 12.5 },
              { name: "Sudirman Said", count: 204, percentage: 10.0 },
              { name: "Purbaya Yudhi Sadewa", count: 153, percentage: 7.5 },
            ],
            capres_dipilih_tertutup_c1c: [
              { name: "Prabowo Subianto", count: 860, percentage: 42.0 },
              { name: "Anies Baswedan", count: 450, percentage: 22.0 },
              { name: "Dedi Mulyadi", count: 390, percentage: 19.0 },
              { name: "Agus Harimurti Yudhoyono", count: 185, percentage: 9.0 },
              { name: "Lainnya / Golput", count: 160, percentage: 7.8 },
            ],
          },
          presidential_simulation: {
            simulasi_10_nama: [
              { name: "Prabowo Subianto", count: 880, percentage: 43.0 },
              { name: "Anies Baswedan", count: 430, percentage: 21.0 },
              { name: "Dedi Mulyadi", count: 370, percentage: 18.1 },
              { name: "Agus Harimurti Yudhoyono", count: 175, percentage: 8.6 },
              { name: "Erick Thohir", count: 82, percentage: 4.0 },
              { name: "Khofifah Indar Parawansa", count: 61, percentage: 3.0 },
              { name: "Tidak Tahu", count: 47, percentage: 2.3 },
            ],
            simulasi_5_nama: [
              { name: "Prabowo Subianto", count: 960, percentage: 46.9 },
              { name: "Anies Baswedan", count: 470, percentage: 23.0 },
              { name: "Dedi Mulyadi", count: 410, percentage: 20.0 },
              { name: "Agus Harimurti Yudhoyono", count: 163, percentage: 8.0 },
              { name: "Tidak Tahu", count: 42, percentage: 2.1 },
            ],
            klaster_politisi: [
              { name: "Prabowo Subianto", count: 850, percentage: 41.6 },
              { name: "Anies Baswedan", count: 420, percentage: 20.5 },
              { name: "Agus Harimurti Yudhoyono", count: 310, percentage: 15.2 },
              { name: "Puan Maharani", count: 175, percentage: 8.6 },
              { name: "Muhaimin Iskandar", count: 102, percentage: 5.0 },
            ],
            klaster_tokoh: [
              { name: "Dedi Mulyadi", count: 650, percentage: 31.8 },
              { name: "Sudirman Said", count: 390, percentage: 19.1 },
              { name: "Khofifah Indar Parawansa", count: 360, percentage: 17.6 },
              { name: "Sri Mulyani", count: 295, percentage: 14.4 },
              { name: "Andika Perkasa", count: 205, percentage: 10.0 },
            ],
            klaster_profesional: [
              { name: "Sri Mulyani", count: 580, percentage: 28.4 },
              { name: "Purbaya Yudhi Sadewa", count: 410, percentage: 20.0 },
              { name: "Erick Thohir", count: 360, percentage: 17.6 },
              { name: "Muhamad Chatib Basri", count: 250, percentage: 12.2 },
              { name: "Wishnutama", count: 130, percentage: 6.4 },
            ],
          },
          party_electability: {
            parpol_terbuka_e1a: [
              { name: "PDI Perjuangan", count: 340, percentage: 16.6 },
              { name: "Partai Gerindra", count: 308, percentage: 15.1 },
              { name: "Partai Golkar", count: 256, percentage: 12.5 },
              { name: "PKB", count: 205, percentage: 10.0 },
              { name: "Partai NasDem", count: 185, percentage: 9.0 },
              { name: "Partai Demokrat", count: 155, percentage: 7.6 },
              { name: "PKS", count: 143, percentage: 7.0 },
            ],
            parpol_dipilih_e1d: [
              { name: "PDI Perjuangan", count: 360, percentage: 17.6 },
              { name: "Partai Gerindra", count: 328, percentage: 16.0 },
              { name: "Partai Golkar", count: 266, percentage: 13.0 },
              { name: "PKB", count: 215, percentage: 10.5 },
              { name: "Partai NasDem", count: 195, percentage: 9.5 },
              { name: "Tidak Tahu / Golput", count: 248, percentage: 12.1 },
            ],
          },
          government_performance: {
            opini_kinerja_f1a: [
              { name: "Pembangunan infrastruktur sudah baik, tapi ekonomi rakyat kecil masih terbengkalai.", count: 512, percentage: 25.0 },
              { name: "Program makan bergizi gratis dan bantuan sosial sangat membantu.", count: 430, percentage: 21.0 },
              { name: "Masih banyak korupsi dan ketidaktransparanan di pemerintahan.", count: 368, percentage: 18.0 },
              { name: "Pemerintah sudah bekerja keras, hasilnya pelan-pelan mulai terasa.", count: 307, percentage: 15.0 },
              { name: "Hilirisasi bagus, tapi rakyat belum merasakan manfaat langsung.", count: 246, percentage: 12.0 },
            ],
            tidak_suka_kinerja_f1b: [
              { name: "Harga kebutuhan pokok terus naik tidak terkendali.", count: 716, percentage: 35.0 },
              { name: "Pengangguran masih tinggi, lapangan kerja kurang.", count: 614, percentage: 30.0 },
              { name: "Korupsi masih merajalela di semua lini pemerintahan.", count: 512, percentage: 25.0 },
              { name: "Kebijakan sering berubah dan tidak konsisten.", count: 265, percentage: 12.9 },
            ],
            harapan_pemerintah_f1c: [
              { name: "Fokus pada ketahanan pangan dan stabilitas harga.", count: 820, percentage: 40.1 },
              { name: "Ciptakan lapangan kerja berkualitas untuk anak muda.", count: 614, percentage: 30.0 },
              { name: "Berantas korupsi sampai ke akar-akarnya.", count: 512, percentage: 25.0 },
              { name: "Perkuat jaminan kesehatan dan pendidikan gratis.", count: 307, percentage: 15.0 },
            ],
            isu_mendesak_f5c: [
              { name: "Pengangguran dan lapangan kerja", count: 920, percentage: 45.0 },
              { name: "Harga kebutuhan pokok / inflasi", count: 840, percentage: 41.1 },
              { name: "Kemiskinan dan kesenjangan ekonomi", count: 720, percentage: 35.2 },
              { name: "Korupsi dan penegakan hukum", count: 650, percentage: 31.8 },
              { name: "Pendidikan berkualitas dan merata", count: 540, percentage: 26.4 },
            ],
            penilaian_keseluruhan_f5a: [
              { name: "Sangat Baik", count: 307, percentage: 15.0 },
              { name: "Baik", count: 614, percentage: 30.0 },
              { name: "Cukup", count: 716, percentage: 35.0 },
              { name: "Kurang Baik", count: 307, percentage: 15.0 },
              { name: "Tidak Baik", count: 101, percentage: 4.9 },
            ],
            skor_keseluruhan_f5b: 6.8,
            kinerja_sektoral_f2: [
              { name: "Pelayanan Publik", count: 70, percentage: 70 },
              { name: "Ekonomi & Lapangan Kerja", count: 58, percentage: 58 },
              { name: "Infrastruktur", count: 72, percentage: 72 },
              { name: "Tanggap Bencana", count: 65, percentage: 65 },
              { name: "Pendidikan & SDM", count: 68, percentage: 68 },
              { name: "Lingkungan & Hutan", count: 55, percentage: 55 },
              { name: "Pertahanan & HAM", count: 71, percentage: 71 },
              { name: "Ketahanan Pangan", count: 63, percentage: 63 },
              { name: "Demokrasi & Politik", count: 61, percentage: 61 },
              { name: "Pajak & Keuangan", count: 60, percentage: 60 },
            ],
            kepercayaan_publik_f4: [
              { name: "Kepercayaan terhadap Pemerintah", count: 68, percentage: 68 },
              { name: "Integritas & Kejujuran Pemerintah", count: 62, percentage: 62 },
              { name: "Pemerintah bekerja untuk rakyat", count: 65, percentage: 65 },
            ],
            kepemimpinan_strategis_f3: [
              { name: "Kejelasan Visi & Arah Kebijakan", count: 68, percentage: 68 },
              { name: "Kecepatan Respons Masalah", count: 64, percentage: 64 },
              { name: "Ketegasan Keputusan Strategis", count: 72, percentage: 72 },
              { name: "Konsistensi Pernyataan & Kebijakan", count: 61, percentage: 61 },
              { name: "Kemampuan Koordinasi Kebijakan", count: 65, percentage: 65 },
            ],
          },
          voter_behavior: {
            alasan_memilih_g1a: [
              { name: "Rekam jejak bersih dan terbukti mampu memimpin.", count: 614, percentage: 30.0 },
              { name: "Program nyata yang langsung dirasakan rakyat.", count: 512, percentage: 25.0 },
              { name: "Sosok yang dekat dan paham kebutuhan masyarakat bawah.", count: 430, percentage: 21.0 },
              { name: "Berani memberantas korupsi tanpa pandang bulu.", count: 307, percentage: 15.0 },
              { name: "Pengalaman dan ketegasan dalam kepemimpinan nasional.", count: 182, percentage: 8.9 },
            ],
            pertimbangan_utama_g1b: [
              { name: "Rekam jejak dan integritas kandidat", count: 1025, percentage: 50.1 },
              { name: "Visi misi dan program kerja", count: 870, percentage: 42.5 },
              { name: "Kedekatan dengan rakyat", count: 716, percentage: 35.0 },
              { name: "Dukungan partai politik", count: 307, percentage: 15.0 },
              { name: "Faktor agama / etnis", count: 204, percentage: 10.0 },
              { name: "Pengaruh keluarga/lingkungan", count: 164, percentage: 8.0 },
            ],
            preferensi_kampanye_g2: [
              { name: "Media Sosial (FB/IG/TikTok)", count: 1230, percentage: 60.1 },
              { name: "Pertemuan Langsung dengan Calon", count: 920, percentage: 45.0 },
              { name: "Rapat Terbuka", count: 614, percentage: 30.0 },
              { name: "Kampanye via Influencer / Tokoh", count: 510, percentage: 24.9 },
              { name: "Alat Peraga (Baliho/Spanduk)", count: 307, percentage: 15.0 },
              { name: "Konvoi di Jalanan", count: 164, percentage: 8.0 },
            ],
            faktor_pilihan_g3: [
              { name: "Rekam Jejak & Integritas", count: 1230, percentage: 60.1 },
              { name: "Visi Misi & Program Kerja", count: 980, percentage: 47.9 },
              { name: "Ketokohan & Popularitas", count: 614, percentage: 30.0 },
              { name: "Praktik Bagi-bagi Uang (negatif)", count: 82, percentage: 4.0 },
            ],
            pengaruh_lingkungan_g4: [
              { name: "Tokoh Agama", count: 716, percentage: 35.0 },
              { name: "Keluarga", count: 614, percentage: 30.0 },
              { name: "Teman Pergaulan", count: 512, percentage: 25.0 },
              { name: "Pejabat Setempat", count: 307, percentage: 15.0 },
              { name: "LSM / Ormas Lokal", count: 164, percentage: 8.0 },
            ],
          },
          public_emotion: {
            tingkat_kepercayaan_tokoh: [
              { name: "Prabowo Subianto", count: 72, percentage: 72 },
              { name: "Gibran Rakabuming Raka", count: 65, percentage: 65 },
              { name: "Dedi Mulyadi", count: 68, percentage: 68 },
              { name: "Purbaya Yudhi Sadewa", count: 61, percentage: 61 },
              { name: "Sudirman Said", count: 63, percentage: 63 },
            ],
            persepsi_tokoh_nasional: [
              { name: "Prabowo Subianto — Tegas & Berpengalaman", count: 860, percentage: 42.1 },
              { name: "Anies Baswedan — Cerdas & Pro-Rakyat", count: 450, percentage: 22.0 },
              { name: "Dedi Mulyadi — Merakyat & Inovatif", count: 390, percentage: 19.1 },
              { name: "Agus Harimurti Yudhoyono — Muda & Militer", count: 185, percentage: 9.0 },
              { name: "Sudirman Said — Bersih & Antikorupsi", count: 160, percentage: 7.8 },
            ],
          },
          surveyor_validation: {
            surveyor_aktif: [
              { name: "Budi Santoso", count: 245, percentage: 12.0 },
              { name: "Siti Aminah", count: 230, percentage: 11.2 },
              { name: "Ahmad Fauzi", count: 215, percentage: 10.5 },
              { name: "Dewi Lestari", count: 200, percentage: 9.8 },
              { name: "Rian Hidayat", count: 190, percentage: 9.3 },
              { name: "Fitri Handayani", count: 180, percentage: 8.8 },
              { name: "Joko Susilo", count: 175, percentage: 8.6 },
              { name: "Larasati Putri", count: 160, percentage: 7.8 },
              { name: "Hendra Wijaya", count: 150, percentage: 7.3 },
              { name: "Indah Wahyuni", count: 100, percentage: 4.9 },
            ],
            sebaran_provinsi: [
              { name: "Jawa Barat", count: 368, percentage: 18.0 },
              { name: "Jawa Timur", count: 307, percentage: 15.0 },
              { name: "Jawa Tengah", count: 286, percentage: 14.0 },
              { name: "Sumatera Utara", count: 123, percentage: 6.0 },
              { name: "Banten", count: 102, percentage: 5.0 },
              { name: "DKI Jakarta", count: 82, percentage: 4.0 },
              { name: "Sulawesi Selatan", count: 82, percentage: 4.0 },
              { name: "Lainnya", count: 695, percentage: 34.0 },
            ],
            total_valid: 1967,
            pct_valid: "96.2%",
          },
        },
      };
      return res.json(demoData);
    }

    // Basic URL validation
    try {
      new URL(scriptUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL format. URL must start with http:// or https://" });
    }

    try {
      const sep = scriptUrl.includes("?") ? "&" : "?";
      const fetchUrl = presentationMode
        ? `${scriptUrl}${sep}mode=presentation`
        : scriptUrl;
      const response = await axios.get(fetchUrl, { timeout: 15000 });
      res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching survey data:", error.message);
      if (error.response) {
        return res.status(error.response.status).json({
          error: `Google Apps Script returned an error (${error.response.status})`,
          details: error.message,
        });
      }
      res.status(500).json({
        error: "Failed to fetch survey data from Google Apps Script",
        details: error.message,
      });
    }
  });

  // API Route: Save survey settings to Google Apps Script
  app.post("/api/survey-settings", async (req, res) => {
    const { scriptUrl, settings } = req.body as { scriptUrl?: string; settings?: Record<string, any> };

    if (!scriptUrl || typeof scriptUrl !== "string") {
      return res.status(400).json({ error: "scriptUrl wajib diisi" });
    }

    // Handle demo mode
    if (scriptUrl === "demo") {
      return res.json({ ok: true, message: "Demo: pengaturan disimulasikan." });
    }

    try {
      new URL(scriptUrl);
    } catch {
      return res.status(400).json({ error: "Format URL tidak valid" });
    }

    try {
      const response = await axios.post(scriptUrl, { action: "saveSettings", settings }, {
        timeout: 15000,
        headers: { "Content-Type": "application/json" },
      });
      const appsScriptData = response.data;
      if (appsScriptData?.success === false) {
        return res.json({ ok: false, warning: appsScriptData.error ?? "Apps Script menolak permintaan. Pengaturan tetap disimpan di Firestore.", details: appsScriptData });
      }
      return res.json({ ok: true, ...appsScriptData });
    } catch (error: any) {
      console.warn("survey-settings: Apps Script POST failed (non-fatal):", error.message);
      return res.json({ ok: false, warning: "Apps Script belum mendukung doPost. Deploy code.gs terbaru agar sinkron. Pengaturan tetap disimpan di Firestore.", details: error.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
