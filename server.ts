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

  // API Route: Proxy to Google Apps Script
  app.get("/api/survey-data", async (req, res) => {
    let { scriptUrl } = req.query;
    
    if (!scriptUrl || typeof scriptUrl !== "string") {
      return res.status(400).json({ error: "Script URL is missing or invalid" });
    }

    scriptUrl = scriptUrl.trim();

    if (scriptUrl === "demo") {
      const demoData = {
        meta: {
          survey_name: "SURVEI KEPUASAN LAYANAN PUBLIK",
          period: "Januari - Desember 2026",
          total_respondents: 250,
          last_updated: new Date().toISOString()
        },
        ikm: {
          score: 88.42,
          category: "SANGAT BAIK",
          label: "A"
        },
        indicators: [
          { id: 1, label: "Persyaratan", avg: 3.85, distribution: [5, 12, 85, 148] },
          { id: 2, label: "Prosedur", avg: 3.62, distribution: [8, 25, 102, 115] },
          { id: 3, label: "Waktu Pelayanan", avg: 3.45, distribution: [15, 45, 95, 95] },
          { id: 4, label: "Biaya/Tarif", avg: 3.92, distribution: [2, 5, 45, 198] },
          { id: 5, label: "Produk Spesifikasi", avg: 3.75, distribution: [4, 18, 92, 136] },
          { id: 6, label: "Kompetensi Pelaksana", avg: 3.68, distribution: [6, 22, 110, 112] },
          { id: 7, label: "Perilaku Pelaksana", avg: 3.82, distribution: [3, 15, 88, 144] },
          { id: 8, label: "Sarana Prasarana", avg: 3.55, distribution: [10, 35, 120, 85] },
          { id: 9, label: "Penanganan Pengaduan", avg: 3.42, distribution: [18, 42, 105, 85] }
        ],
        demographics: {
          gender: { "Laki-laki": 142, "Perempuan": 108 },
          education: { "SMP": 15, "SMA": 85, "D3": 42, "S1": 98, "S2/S3": 10 }
        },
        open_ended: {
          general_opinion: [
            "Proses pendaftaran sangat mudah dan cepat dibanding tahun lalu.",
            "Petugas di loket sangat ramah dan membantu menjelaskan prosedur yang kurang saya pahami.",
            "Aplikasi online seringkali lambat saat jam sibuk, mohon ditingkatkan kapasitas servernya.",
            "Fasilitas ruang tunggu sangat nyaman, bersih dan sejuk.",
            "Informasi di website sangat lengkap, saya tidak perlu bolak-balik bertanya ke kantor."
          ],
          expectations: [
            "Mohon agar jam istirahat petugas bisa bergantian sehingga pelayanan tetap buka.",
            "Perlu adanya penambahan jumlah petugas di loket pembayaran agar antrian tidak terlalu panjang.",
            "Tingkatkan lagi sosialisasi layanan baru melalui media sosial agar masyarakat lebih tahu.",
            "Diharapkan ada fitur tracking dokumen lewat WhatsApp agar lebih praktis.",
            "Fasilitas parkir untuk penyandang disabilitas mohon diperbanyak dan diletakkan dekat pintu masuk."
          ]
        },
        respondents: Array.from({ length: 20 }, (_, i) => ({
          id: `R${i + 1}`,
          name: [
            "Ahmad Fauzi", "Siska Pertiwi", "Bambang Wijaya", "Lestari Putri", "Andi Pratama",
            "Diana Sari", "Eko Prasetyo", "Fitri Handayani", "Guruh Soekarno", "Hana Pertiwi",
            "Indra Jaya", "Julia Roberts", "Kurnia Sandi", "Lucky Hakim", "Maya Septha",
            "Nanda Arsyad", "Oki Setiana", "Putri Marino", "Qory Sandioriva", "Rizky Billar"
          ][i],
          timestamp: new Date(Date.now() - (Math.random() * 86400000 * 7)).toISOString(),
          gender: Math.random() > 0.5 ? "Laki-laki" : "Perempuan",
          education: ["SMA", "S1", "D3", "S2"][Math.floor(Math.random() * 4)],
          answers: {
            "Persyaratan": Math.floor(Math.random() * 2) + 3,
            "Prosedur": Math.floor(Math.random() * 3) + 2,
            "Waktu": Math.floor(Math.random() * 2) + 2,
            "S Saran": "Pelayanan sudah cukup baik, mohon dipertahankan kualitasnya."
          }
        }))
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
      const response = await axios.get(scriptUrl, {
        timeout: 15000,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching survey data:", error.message);
      
      if (error.response) {
        // GAS returned an error
        return res.status(error.response.status).json({ 
          error: `Google Apps Script returned an error (${error.response.status})`, 
          details: error.message 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch survey data from Google Apps Script", 
        details: error.message 
      });
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
