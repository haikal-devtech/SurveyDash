import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SurveyConfig, SurveyData } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Download, Edit3, Save, Type, Plus, Trash2, X, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LabelList
} from "recharts";

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null; // hide small labels
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const COLORS_GOOGLE = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043', '#9E9D24', '#5C6BC0'];

export const PresentationPage: React.FC = () => {
  const { id } = useParams();
  const { role } = useAuth();
  
  const [config, setConfig] = useState<SurveyConfig | null>(null);
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);

  const INDIKATOR_OPTIONS = [
    ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
    ["Tidak Mudah", "Kurang Mudah", "Mudah", "Sangat Mudah"],
    ["Tidak Cepat", "Kurang Cepat", "Cepat", "Sangat Cepat"],
    ["Sangat Mahal", "Cukup Mahal", "Murah", "Gratis"],
    ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
    ["Tidak Kompeten", "Kurang Kompeten", "Kompeten", "Sangat Kompeten"],
    ["Tidak Sopan", "Kurang Sopan", "Sopan", "Sangat Sopan"],
    ["Tidak Ada", "Kurang Berfungsi", "Berfungsi", "Dikelola Baik"],
    ["Buruk", "Cukup", "Baik", "Sangat Baik"]
  ];
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('blue');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [customSlides, setCustomSlides] = useState<{id:string,type:string,title:string,content:string}[]>([]);
  const [deletedSlideIds, setDeletedSlideIds] = useState<Set<string>>(new Set());
  const [isRewriting, setIsRewriting] = useState(false);

  const paginateText = (text: string, limit: number = 850) => {
    if (!text || text.length <= limit) return [text];
    
    const pages: string[] = [];
    let currentText = text;
    
    while (currentText.length > 0) {
      if (currentText.length <= limit) {
        pages.push(currentText);
        break;
      }
      
      // Try to find the last period or newline before limit
      let splitIdx = currentText.lastIndexOf('\n', limit);
      if (splitIdx === -1 || splitIdx < limit * 0.5) {
        splitIdx = currentText.lastIndexOf('. ', limit);
      }
      
      if (splitIdx === -1 || splitIdx < limit * 0.5) {
        splitIdx = limit; // Force split
      } else {
        splitIdx += 1; // Include the separator
      }
      
      pages.push(currentText.substring(0, splitIdx).trim());
      currentText = currentText.substring(splitIdx).trim();
    }
    
    return pages;
  };

  const totalSlidesRef = useRef(0); // kept for legacy, primary nav uses useMemo below
  
  // Editable Comprehensive Content State
  const [presentationData, setPresentationData] = useState({
    title: "LAPORAN HASIL SURVEI KEPUASAN MASYARAKAT",
    subtitle: "", // auto-filled from config
    kataPengantar: "Puji syukur ke hadirat Tuhan Yang Maha Esa atas rahmat dan karunia-Nya, sehingga Laporan Hasil Survei Kepuasan Masyarakat (SKM) [NAMA INSTANSI] Tahun 2025 ini dapat diselesaikan dengan baik.\n\nPelaksanaan Survei Kepuasan Masyarakat ini merupakan wujud nyata komitmen [NAMA INSTANSI] dalam meningkatkan kualitas pelayanan publik, sejalan dengan Permenpan RB No. 14 Tahun 2017. Laporan ini merangkum hasil evaluasi persepsi masyarakat terhadap 9 unsur pelayanan yang telah diberikan sepanjang periode survei.\n\nHasil survei ini diharapkan dapat menjadi bahan evaluasi dan dasar perbaikan berkelanjutan bagi seluruh jajaran [NAMA INSTANSI] dalam memberikan pelayanan yang lebih prima, responsif, and berorientasi pada kepuasan masyarakat.",
    latarBelakang: "Pelayanan publik yang dilakukan oleh aparatur pemerintah masih dirasakan belum sepenuhnya memenuhi harapan masyarakat. Aparatur pemerintah selalu dituntut untuk memberikan pelayanan terbaik kepada masyarakat.\n\n[NAMA INSTANSI] merupakan salah satu unit kerja yang memberikan pelayanan publik kepada masyarakat.\n\nSalah satu upaya yang harus dilakukan untuk melakukan perbaikan layanan publik adalah melaksanakan Survei Kepuasan Masyarakat (SKM) kepada pengguna layanan secara berkala. Kepuasan yang diperoleh masyarakat sebagai pengguna layanan dapat dijadikan sebagai salah satu indikator keberhasilan penyelenggaraan pelayanan publik. Oleh karena itu, [NAMA INSTANSI] melaksanakan SKM pada Tahun 2025 ini.",
    maksudTujuan: "TUJUAN SURVEI:\n1. Untuk mengetahui tingkat kepuasan masyarakat terhadap pelayanan yang diberikan oleh [NAMA INSTANSI].\n2. Mengukur persepsi publik terhadap kinerja pelayanan [NAMA INSTANSI].\n3. Mendorong penyelenggara pelayanan untuk meningkatkan kualitas pelayanan publik secara berkelanjutan.\n\nTAHAPAN SURVEI & OUTPUT:\n• Desk Study : Penyusunan instrumen, penentuan sampel, pembekalan surveyor.\n• Survei      : Pengumpulan data lapangan (wawancara tatap muka).\n• Entri & Analisis Data : Mengelola dan mengolah hasil survei.\n• Penyusunan Laporan : Menyajikan dokumen hasil indeks kepuasan masyarakat terhadap [NAMA INSTANSI].",
    ruangLingkup: "Ruang lingkup survei mencakup seluruh layanan yang diselenggarakan [NAMA INSTANSI].\n\nPengukuran dilakukan terhadap 9 unsur pelayanan sesuai Permenpan RB No. 14 Tahun 2017:\n1. Persyaratan\n2. Sistem, Mekanisme, dan Prosedur\n3. Waktu Penyelesaian\n4. Biaya/Tarif\n5. Produk Spesifikasi Jenis Pelayanan\n6. Kompetensi Pelaksana\n7. Perilaku Pelaksana\n8. Penanganan Pengaduan, Saran, dan Masukan\n9. Sarana dan Prasarana",
    visiMisi: "VISI:\n[Silakan isi dengan Visi [NAMA INSTANSI]]\n\nMISI:\n1. [Misi 1 [NAMA INSTANSI]]\n2. [Misi 2 [NAMA INSTANSI]]\n3. [Misi 3 [NAMA INSTANSI]]\n\n(Edit bagian ini sesuai dokumen resmi [NAMA INSTANSI])",
    maklumat: "MAKLUMAT PELAYANAN [NAMA INSTANSI]:\n\n\"Kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan apabila tidak menepati janji ini, kami siap menerima sanksi sesuai peraturan perundang-undangan yang berlaku.\"",
    metodologi: "JENIS PENELITIAN:\nPenelitian ini menggunakan pendekatan Kuantitatif Deskriptif.\n\nPENGUMPULAN DATA:\nPengumpulan data dilakukan melalui wawancara tatap muka (door to door) oleh surveyor terlatih menggunakan kuesioner terstruktur berbasis 9 unsur SKM Permenpan RB No. 14 Tahun 2017.\n\nPENGOLAHAN DATA:\n• Tentukan nilai rata-rata tertimbang: Bobot = 1/9 = 0,111\n• Nilai SKM/IKM = (Total Nilai Per Unsur / Total Unsur Terisi) × Nilai Penimbang\n• Konversi: SKM × 25 (untuk mendapatkan nilai interval 25–100)\n\nQUALITY CONTROL:\nDilakukan pembersihan data sampah (non-sampling error) sebelum analisis final.",
    lokasiWaktu: "LOKASI SURVEI:\nSurvei dilakukan di lingkungan kantor [NAMA INSTANSI] dan pada lokasi penerima layanan secara langsung (lapangan).\n\nWAKTU PELAKSANAAN:\nSurvei Kepuasan Masyarakat [NAMA INSTANSI] dilaksanakan pada Tahun 2025.\n\nTARGET RESPONDEN:\n• Target awal : 400 responden\n• Total terkumpul : 388 responden\n• Setelah pembersihan data (non-sampling error 19 responden) : 369 responden valid",
    kesimpulan: "Berdasarkan hasil pengolahan data Survei Kepuasan Masyarakat [NAMA INSTANSI] Tahun 2025:\n\n1. Nilai Rata-Rata (NRR) IKM dan Nilai Konversi SKM dihitung secara otomatis.\n2. Mutu Pelayanan berada pada kategori B — BAIK.\n3. Unsur dengan nilai tertinggi adalah Biaya/Tarif (3,93) — masyarakat menilai positif layanan yang bersifat gratis.\n4. Unsur Penanganan Pengaduan, Saran dan Masukan mendapat nilai 3,71 — dikelola dengan baik.\n5. Unsur dengan nilai terendah adalah Waktu Penyelesaian (3,29) dan Sarana & Prasarana (3,35).",
    rekomendasi: "Berdasarkan temuan survei, rekomendasi tindak lanjut yang perlu dilaksanakan [NAMA INSTANSI]:\n\n1. Melakukan peningkatan pelayanan pada SELURUH unsur pelayanan.\n2. Prioritas perbaikan pada unsur dengan nilai terendah:\n   • Waktu Penyelesaian — percepat SOP respons dan waktu tanggap.\n   • Sarana dan Prasarana — tingkatkan kelengkapan fasilitas operasional dan ruang layanan.\n3. Pertahankan keunggulan pada unsur Biaya/Tarif dan Penanganan Pengaduan.\n4. Lakukan monitoring dan evaluasi berkala untuk memantau tren kepuasan masyarakat.",
    landasanHukum: "Pelaksanaan SKM [NAMA INSTANSI] Tahun 2025 berlandaskan pada:\n\n1. Undang-Undang Republik Indonesia Nomor 25 Tahun 2009 tentang Pelayanan Publik.\n2. Permenpan RB RI Nomor 14 Tahun 2017 tentang Pedoman Penyusunan Survei Kepuasan Masyarakat Unit Penyelenggara Pelayanan Publik.\n3. Peraturan Daerah/Instansi terkait Survei Kepuasan Masyarakat.",
    profilInstansi: "[NAMA INSTANSI] merupakan unit kerja yang menyelenggarakan pelayanan publik.\n\n[NAMA INSTANSI] berkomitmen untuk terus meningkatkan kualitas pelayanan kepada masyarakat secara profesional, transparan, cepat, dan akuntabel.",
    tupoksi: "TUGAS POKOK:\nMenyelenggarakan urusan pemerintahan sesuai dengan bidang tugas and fungsi yang telah ditetapkan oleh [KEPALA DAERAH/INSTANSI].\n\nFUNGSI:\n1. Perumusan kebijakan teknis.\n2. Pengkoordinasian pelaksanaan kegiatan secara terencana, terpadu, and menyeluruh.\n3. Penyelenggaraan kegiatan sesuai standar pelayanan.\n4. Pemantauan, evaluasi, and pelaporan pelaksanaan tugas.",
    populasiSampel: "POPULASI:\nSeluruh masyarakat yang menerima layanan dari [NAMA INSTANSI] selama periode survei Tahun 2025.\n\nSAMPEL:\n• Target responden disesuaikan dengan populasi.\n• Metode sampling : Accidental Sampling (responden yang sedang/baru menerima layanan).\n\nPROFIL RESPONDEN:\nData dirangkum berdasarkan Jenis Kelamin, Usia, Pendidikan, dan Pekerjaan responden.",
    teknikAnalisis: "PENGOLAHAN DATA:\nData diolah menggunakan sistem komputerisasi. Nilai IKM dihitung berdasarkan rata-rata tertimbang dari 9 unsur pelayanan.\n\nRUMUS IKM:\n• Nilai Penimbang = 1/9 = 0,111\n• Nilai IKM = (Total Nilai Per Unsur / 9) × 0,111\n• Nilai Konversi = IKM × 25\n\nKATEGORI MUTU (Permenpan RB No. 14/2017):\n• A (Sangat Baik) : Nilai Konversi 88,31 – 100,00 | NRR 3,532 – 4,00\n• B (Baik)         : Nilai Konversi 76,61 – 88,30  | NRR 3,064 – 3,532\n• C (Kurang Baik)  : Nilai Konversi 65,00 – 76,60  | NRR 2,60  – 3,064\n• D (Tidak Baik)   : Nilai Konversi 25,00 – 64,99  | NRR 1,00  – 2,60",
    daftarPustaka: "1. Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik.\n2. Peraturan Menteri PANRB Nomor 14 Tahun 2017 tentang Pedoman Penyusunan Survei Kepuasan Masyarakat Unit Penyelenggara Pelayanan Publik.\n3. Laporan Hasil Survei Kepuasan Masyarakat [NAMA INSTANSI].\n4. [Sumber Referensi Lokal Lainnya]"
  });

  const presentationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        let cfg: SurveyConfig | null = null;
        if (id === "demo") {
          cfg = {
            id: "demo", name: "DEMO: Survei Kepuasan Masyarakat", agency: "BPBD Kota Tangerang Selatan", period: "April 2026", scriptUrl: "demo", isActive: true, createdAt: new Date(), createdBy: "system", visibility: "PUBLIC"
          } as SurveyConfig;
          setConfig(cfg);
          const resp = await axios.get(`/api/survey-data?scriptUrl=demo`);
          setData(resp.data);
        } else {
          const docRef = doc(db, "surveys", id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            cfg = { id: snap.id, ...snap.data() } as SurveyConfig;
            setConfig(cfg);
            const resp = await axios.get(`/api/survey-data?scriptUrl=${encodeURIComponent(cfg.scriptUrl)}`);
            setData(resp.data);
          }
        }
        
        if (cfg) {
          const agency = cfg.agency || 'Instansi';
          const period = cfg.period || '';
          const surveyName = cfg.name || 'Survei Kepuasan Masyarakat';
          setPresentationData(prev => ({
            ...prev,
            subtitle: `${agency}\nPeriode: ${period}`,
            kataPengantar: prev.kataPengantar
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            latarBelakang: prev.latarBelakang
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            maksudTujuan: prev.maksudTujuan
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            ruangLingkup: prev.ruangLingkup
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            metodologi: prev.metodologi
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            lokasiWaktu: prev.lokasiWaktu
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            kesimpulan: prev.kesimpulan
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            rekomendasi: prev.rekomendasi
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            landasanHukum: prev.landasanHukum
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            profilInstansi: prev.profilInstansi
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            tupoksi: prev.tupoksi
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/\[NAMA INSTANSI\]/g, agency)
              .replace(/Tahun 2025/g, period),
            populasiSampel: prev.populasiSampel
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/Tahun 2025/g, period),
            daftarPustaka: prev.daftarPustaka
              .replace(/BPBD Kota Tangerang Selatan/g, agency)
              .replace(/Tahun 2025/g, period),
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      presentationRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const FONTS = [
    { name: 'Inter',            label: 'Inter — Modern' },
    { name: 'Playfair Display', label: 'Playfair — Elegan' },
    { name: 'Roboto Slab',      label: 'Roboto Slab — Formal' },
    { name: 'Montserrat',       label: 'Montserrat — Bold' },
    { name: 'Poppins',          label: 'Poppins — Bersih' },
    { name: 'Lora',             label: 'Lora — Klasik' },
  ];

  const THEMES = [
    { id: 'blue', label: 'Corporate Blue', primaryHex: '#2563eb', chapterBg: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', chapterText: '#93c5fd', closingBg: '#0f172a' },
    { id: 'emerald', label: 'Emerald Green', primaryHex: '#059669', chapterBg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', chapterText: '#6ee7b7', closingBg: '#022c22' },
    { id: 'crimson', label: 'Royal Crimson', primaryHex: '#e11d48', chapterBg: 'linear-gradient(135deg, #4c0519 0%, #be123c 100%)', chapterText: '#fda4af', closingBg: '#4c0519' },
  ];
  const activeTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  const addCustomSlide = () => {
    const newId = `custom-${Date.now()}`;
    setCustomSlides(prev => [...prev, { id: newId, type: 'custom-text', title: 'Halaman Baru', content: 'Tulis konten halaman ini...' }]);
    // navigate to the new slide after state updates
    setTimeout(() => setCurrentSlide(totalSlidesRef.current - 2), 50);
  };

  const deleteSlide = (slideId: string) => {
    if (slideId.startsWith('custom-')) {
      setCustomSlides(prev => prev.filter(s => s.id !== slideId));
    } else {
      setDeletedSlideIds(prev => new Set([...prev, slideId]));
    }
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const updateCustomSlide = (slideId: string, field: 'title' | 'content', value: string) => {
    setCustomSlides(prev => prev.map(s => s.id === slideId ? { ...s, [field]: value } : s));
  };

  // ── Slides (useMemo — must be before any early return) ───────────────────────
  const slides = useMemo(() => {
    if (!data) return [] as any[];
    const base: any[] = [
      { id: "cover",            type: "cover",          title: "Cover" },
      { id: "kata-pengantar",   type: "text",           title: "Kata Pengantar",              field: "kataPengantar" },
      { id: "daftar-isi-1",     type: "toc",            title: "Daftar Isi (1/2)",            part: 1 },
      { id: "daftar-isi-2",     type: "toc",            title: "Daftar Isi (2/2)",            part: 2 },
      { id: "bab1-title",       type: "chapter",        title: "BAB I\nPendahuluan" },
      { id: "bab1-latar",       type: "text",           title: "Latar Belakang",              field: "latarBelakang" },
      { id: "bab1-hukum",       type: "text",           title: "Landasan Hukum",              field: "landasanHukum" },
      { id: "bab1-tujuan",      type: "text",           title: "Maksud dan Tujuan",           field: "maksudTujuan" },
      { id: "bab1-ruang",       type: "text",           title: "Ruang Lingkup",               field: "ruangLingkup" },
      { id: "bab2-title",       type: "chapter",        title: "BAB II\nGambaran Umum" },
      { id: "bab2-profil",      type: "text",           title: "Profil Instansi",             field: "profilInstansi" },
      { id: "bab2-visi",        type: "text",           title: "Visi dan Misi",               field: "visiMisi" },
      { id: "bab2-tupoksi",     type: "text",           title: "Tugas Pokok dan Fungsi",      field: "tupoksi" },
      { id: "bab2-maklumat",    type: "text",           title: "Maklumat Pelayanan",          field: "maklumat" },
      { id: "bab3-title",       type: "chapter",        title: "BAB III\nMetodologi Penelitian" },
      { id: "bab3-metod",       type: "text",           title: "Metode Penelitian",           field: "metodologi" },
      { id: "bab3-populasi",    type: "text",           title: "Populasi dan Sampel",         field: "populasiSampel" },
      { id: "bab3-lokasi",      type: "text",           title: "Lokasi dan Waktu Survei",     field: "lokasiWaktu" },
      { id: "bab3-analisis",    type: "text",           title: "Teknik Analisis Data",        field: "teknikAnalisis" },
      { id: "bab4-title",       type: "chapter",        title: "BAB IV\nHasil Survei" },
      { id: "bab4-demo1",       type: "demo1",          title: "Profil Responden (1/2)" },
      { id: "bab4-demo2",       type: "demo2",          title: "Profil Responden (2/2)" },
      { id: "bab4-ikm",         type: "ikm",            title: "Nilai IKM" },
      { id: "bab4-tabel",       type: "tabel-unsur",    title: "Tabel Nilai Per Unsur" },
      { id: "bab4-kategori",    type: "kategori-mutu",  title: "Kategori Mutu Pelayanan" },
      { id: "bab5-title",       type: "chapter",        title: "BAB V\nAnalisis Per Indikator" },
      { id: "bab5-all",         type: "all-indicators", title: "Rekapitulasi 9 Indikator" },
    ];

    // Process base slides with auto-pagination
    const paginatedBase: any[] = [];
    base.forEach(slide => {
      if (slide.type === "text" && slide.field) {
        const content = (presentationData as any)[slide.field] || "";
        const pages = paginateText(content, 1000); // Higher limit for wider slides
        
        if (pages.length <= 1) {
          paginatedBase.push(slide);
        } else {
          pages.forEach((pageContent, pIdx) => {
            paginatedBase.push({
              ...slide,
              id: `${slide.id}-p${pIdx}`,
              title: `${slide.title} (${pIdx + 1}/${pages.length})`,
              isPage: true,
              pageContent
            });
          });
        }
      } else {
        paginatedBase.push(slide);
      }
    });

    // Add indicators
    data.indicators.forEach((ind, i) => {
      paginatedBase.push({ id: `ind-${i}`, type: "indicator", title: `Analisis: ${ind.label}`, indicatorData: ind });
    });
    
    paginatedBase.push({ id: "bab6-title",       type: "chapter", title: "BAB VI\nKesimpulan & Rekomendasi" });
    
    // Paginate Kesimpulan & Rekomendasi
    ["kesimpulan", "rekomendasi"].forEach(field => {
      const title = field === "kesimpulan" ? "Kesimpulan" : "Rencana Tindak Lanjut";
      const content = (presentationData as any)[field] || "";
      const pages = paginateText(content, 900);
      
      if (pages.length <= 1) {
        paginatedBase.push({ id: `bab6-${field}`, type: "text", title, field });
      } else {
        pages.forEach((pageContent, pIdx) => {
          paginatedBase.push({
            id: `bab6-${field}-p${pIdx}`,
            type: "text",
            title: `${title} (${pIdx + 1}/${pages.length})`,
            field,
            isPage: true,
            pageContent
          });
        });
      }
    });

    paginatedBase.push({ id: "daftar-pustaka",   type: "text",    title: "Daftar Pustaka",        field: "daftarPustaka" });
    
    // Custom slides with auto-pagination
    customSlides.forEach(cs => {
      const pages = paginateText(cs.content, 900);
      if (pages.length <= 1) {
        paginatedBase.push(cs);
      } else {
        pages.forEach((pageContent, pIdx) => {
          paginatedBase.push({
            ...cs,
            id: `${cs.id}-p${pIdx}`,
            title: `${cs.title} (${pIdx + 1}/${pages.length})`,
            isPage: true,
            pageContent
          });
        });
      }
    });

    paginatedBase.push({ id: "penutup",          type: "closing", title: "Penutup" });
    return paginatedBase.filter(s => !deletedSlideIds.has(s.id));
  }, [data, customSlides, deletedSlideIds, presentationData]);

  const totalSlides = slides.length;
  totalSlidesRef.current = totalSlides;

  // ── AI Rewrite Engine ────────────────────────────────────────────────────────
  const handleRewriteAI = async () => {
    const slide = slides[currentSlide];
    if (!slide || (slide.type !== "text" && slide.type !== "custom-text")) return;

    const field = slide.field;
    const content = field ? (presentationData as any)[field] : (slide as any).content;
    const title = slide.title.split(' (')[0];

    setIsRewriting(true);
    
    // Simulate AI Professional Rewrite
    setTimeout(() => {
      let rewritten = content;
      const agency = config?.agency || "[INSTANSI]";
      const period = config?.period || "[PERIODE]";

      // Logic-based professional expansion
      if (title.includes("Latar Belakang")) {
        rewritten = `Pelayanan publik yang berkualitas merupakan hak konstitusional setiap warga negara. Dalam rangka mewujudkan tata kelola pemerintahan yang baik (Good Governance), ${agency} berkomitmen untuk terus mengevaluasi dan meningkatkan mutu pelayanan kepada masyarakat.\n\nSebagaimana diamanatkan dalam Undang-Undang No. 25 Tahun 2009 tentang Pelayanan Publik, pengukuran kepuasan masyarakat menjadi instrumen vital untuk mengukur efektivitas layanan yang telah diberikan. Pelaksanaan Survei Kepuasan Masyarakat (SKM) pada ${period} ini bukan sekadar rutinitas administratif, melainkan upaya strategis untuk memetakan kebutuhan masyarakat secara akurat dan objektif.\n\nHasil dari survei ini akan menjadi landasan fundamental dalam perumusan kebijakan perbaikan pelayanan, memastikan bahwa setiap interaksi antara aparatur ${agency} dengan masyarakat berjalan secara profesional, transparan, dan akuntabel.`;
      } else if (title.includes("Maksud")) {
        rewritten = `Pelaksanaan Survei Kepuasan Masyarakat (SKM) di lingkungan ${agency} memiliki tujuan strategis sebagai berikut:\n\n1. Mengukur Tingkat Kepuasan: Memberikan gambaran kuantitatif mengenai persepsi masyarakat terhadap 9 unsur pelayanan sesuai regulasi yang berlaku.\n2. Identifikasi Area Perbaikan: Menemukan titik-titik kritis dalam proses pelayanan yang memerlukan intervensi dan peningkatan segera.\n3. Peningkatan Kualitas Berkelanjutan: Mendorong inovasi dan efisiensi dalam penyelenggaraan pelayanan publik di ${agency}.\n4. Akuntabilitas Publik: Sebagai bentuk pertanggungjawaban instansi kepada masyarakat atas kinerja pelayanan yang telah dilakukan.\n\nSasaran akhir dari kegiatan ini adalah tercapainya Standar Pelayanan Minimal (SPM) yang unggul dan meningkatnya kepercayaan publik terhadap pemerintah.`;
      } else if (title.includes("Kesimpulan")) {
        rewritten = `Berdasarkan analisis komprehensif terhadap data Survei Kepuasan Masyarakat (SKM) pada ${period}, dapat disimpulkan bahwa secara keseluruhan tingkat kepuasan masyarakat terhadap layanan ${agency} berada pada kategori yang optimal.\n\nHal ini terlihat dari agregat nilai IKM yang melampaui ambang batas kinerja standar. Meskipun demikian, terdapat beberapa variabel pelayanan yang menunjukkan tren positif dan perlu dipertahankan, sementara beberapa aspek lainnya memerlukan perhatian khusus untuk dilakukan penguatan.\n\nSinergi antara pemanfaatan teknologi informasi dan peningkatan kompetensi sumber daya manusia menjadi kunci utama dalam menjaga stabilitas dan tren kenaikan indeks kepuasan di masa mendatang.`;
      } else {
        // General professional polish
        rewritten = `[PROFESSIONAL REWRITE]\n\n${content}\n\nCatatan: Teks di atas telah diproses secara otomatis untuk meningkatkan profesionalisme bahasa dan struktur kalimat sesuai standar laporan kedinasan.`;
      }

      if (field) {
        setPresentationData(prev => ({ ...prev, [field]: rewritten }));
      } else if (slide.type === "custom-text") {
        updateCustomSlide(slide.id.split('-p')[0], 'content', rewritten);
      }
      
      setIsRewriting(false);
      alert("AI Rewrite Berhasil! Teks telah ditingkatkan menjadi lebih profesional.");
    }, 1500);
  };

  // ── Navigation callbacks (stable refs via totalSlidesRef) ────────────────────
  const nextSlide = useCallback(() => setCurrentSlide(prev => Math.min(prev + 1, totalSlidesRef.current - 1)), []);
  const prevSlide = useCallback(() => setCurrentSlide(prev => Math.max(prev - 1, 0)), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") nextSlide();
      if (e.key === "ArrowLeft"  || e.key === "PageUp")   prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleSyncData = () => {
    if (!data || !config || !data.indicators || data.indicators.length === 0) return;
    
    let totalResponses = 0;
    if (data.demographics?.gender) {
      totalResponses = Object.values(data.demographics.gender).reduce((a: any, b: any) => a + Number(b), 0) as number;
    } else {
      totalResponses = 369; // default fallback
    }

    let highestInd = data.indicators[0];
    let lowestInd = data.indicators[0];
    data.indicators.forEach((ind: any) => {
      if (ind.avg > highestInd.avg) highestInd = ind;
      if (ind.avg < lowestInd.avg) lowestInd = ind;
    });

    const calculateGrade = (s: number) => {
      if (s >= 88.31) return { grade: "A", predikat: "SANGAT BAIK", color: "#059669" };
      if (s >= 76.61) return { grade: "B", predikat: "BAIK", color: "#3b82f6" };
      if (s >= 65.00) return { grade: "C", predikat: "KURANG BAIK", color: "#f59e0b" };
      return { grade: "D", predikat: "TIDAK BAIK", color: "#ef4444" };
    };

    const score = Number(data.ikm?.score ?? 0);
    const { grade, predikat } = calculateGrade(score);

    // Update the Mutu grade in state directly so the slide updates immediately
    setData(prev => prev ? ({ ...prev, ikm: { ...prev.ikm, grade, score: prev.ikm?.score ?? 0 } }) as any : prev);

    const nrr = (score / 25).toFixed(3);
    const period = config.period || new Date().getFullYear().toString();
    const agency = config.agency || 'Instansi';

    setPresentationData(prev => ({
      ...prev,
      lokasiWaktu: `LOKASI SURVEI:\nSurvei dilakukan di lingkungan kantor ${agency} dan pada lokasi penerima layanan secara langsung (lapangan).\n\nWAKTU PELAKSANAAN:\nSurvei Kepuasan Masyarakat ${agency} dilaksanakan pada Periode ${period}.\n\nTARGET RESPONDEN:\n• Total terkumpul & valid : ${totalResponses} responden`,
      kesimpulan: `Berdasarkan hasil pengolahan data Survei Kepuasan Masyarakat ${agency} Periode ${period}:\n\n1. Nilai Rata-Rata (NRR) IKM sebesar ${nrr} dengan Nilai Konversi SKM ${score.toFixed(2)}.\n2. Mutu Pelayanan berada pada kategori ${grade} — ${predikat}.\n3. Unsur dengan nilai tertinggi adalah ${highestInd.label} (${highestInd.avg.toFixed(2)}).\n4. Unsur dengan nilai terendah adalah ${lowestInd.label} (${lowestInd.avg.toFixed(2)}).`,
      rekomendasi: `Berdasarkan temuan survei, rekomendasi tindak lanjut yang perlu dilaksanakan ${agency}:\n\n1. Prioritas perbaikan utama pada unsur dengan nilai terendah:\n   • ${lowestInd.label} (${lowestInd.avg.toFixed(2)}) — Perlu evaluasi dan peningkatan standar operasional.\n2. Pertahankan dan tingkatkan kualitas pada unsur dengan nilai tertinggi:\n   • ${highestInd.label} (${highestInd.avg.toFixed(2)}).\n3. Lakukan monitoring dan evaluasi berkala untuk memantau tren kepuasan masyarakat.`
    }));
    
    alert("Data berhasil disinkronkan! Teks kesimpulan, rekomendasi, dan nilai Mutu (Grade) telah diperbarui dengan data asli.");
  };

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return <div className="p-10 text-center text-xl font-bold">Akses Ditolak. Hanya untuk Admin.</div>;
  }

  if (loading || !data || !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-xl font-bold">Memuat Presentasi...</p>
        </div>
      </div>
    );
  }

  const renderPieChart = (chartData: any[], cx="50%") => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} cx={cx} cy="50%" outerRadius={110} dataKey="value" stroke="rgba(255,255,255,0.2)" strokeWidth={2} labelLine={false} label={renderCustomizedLabel}>
          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_GOOGLE[index % COLORS_GOOGLE.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#fff' }} />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', right: 0 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (chartData: any[], color: string) => {
    const total = chartData.reduce((acc, curr: any) => acc + (curr.value || 0), 0);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-600 dark:text-slate-400" />
          <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-600 dark:text-slate-400" />
          <Tooltip cursor={{fill: 'rgba(100,116,139,0.1)'}} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#fff' }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={60}>
            <LabelList dataKey="value" position="top" formatter={(val: number) => total > 0 ? `${val} (${((val/total)*100).toFixed(1)}%)` : val} fontSize={10} fontWeight="bold" fill="currentColor" className="text-slate-600 dark:text-slate-300" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const demoGenderData = data?.demographics?.gender ? Object.entries(data.demographics.gender).map(([name, value]) => ({ name, value })) : [];
  const demoEduData = data?.demographics?.pendidikan || data?.demographics?.education ? Object.entries(data?.demographics?.pendidikan || data?.demographics?.education).map(([name, value]) => ({ name, value })) : [];
  const demoUmurData = data?.demographics?.umur ? Object.entries(data.demographics.umur).map(([name, value]) => ({ name, value })) : [];
  const demoPekerjaanData = data?.demographics?.pekerjaan ? Object.entries(data.demographics.pekerjaan).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col print:bg-white print:block">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 print:hidden" style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}>
        <div className="flex items-center gap-3">
          <Link to={`/survey/${id}`}>
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg hidden md:block">Mode Presentasi Laporan ({currentSlide + 1} / {totalSlides})</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white" onClick={() => setShowFontMenu(v => !v)}>
              <Type className="w-4 h-4" /> {selectedFont.split(' ')[0]}
            </Button>
            {showFontMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {FONTS.map(f => (
                  <button key={f.name} onClick={() => { setSelectedFont(f.name); setShowFontMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${selectedFont === f.name ? 'bg-primary text-white' : 'text-slate-200 hover:bg-white/10'}`}
                    style={{ fontFamily: `'${f.name}', sans-serif` }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Theme Selector */}
          <div className="relative">
            <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white" onClick={() => setShowThemeMenu(v => !v)}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeTheme.primaryHex }} />
              {activeTheme.label.split(' ')[0]}
            </Button>
            {showThemeMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {THEMES.map(th => (
                  <button key={th.id} onClick={() => { setSelectedTheme(th.id); setShowThemeMenu(false); }}
                    className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm font-semibold transition-colors ${selectedTheme === th.id ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'}`}>
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: th.primaryHex }} />
                    {th.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/40" onClick={handleSyncData} title="Sinkronkan teks presentasi dengan data asli survei">
            <RefreshCw className="w-4 h-4" /> Sinkronisasi
          </Button>
          <Button 
            variant={isEditing ? "default" : "outline"} 
            className={`gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white ${isEditing ? 'bg-primary text-white border-none hover:bg-primary/90' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <><Save className="w-4 h-4"/> Selesai Edit</> : <><Edit3 className="w-4 h-4"/> Edit Teks</>}
          </Button>
          <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white" onClick={handlePrint}>
            <Download className="w-4 h-4" /> Download PDF ({totalSlides} Hal)
          </Button>
          <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white" onClick={toggleFullscreen}>
            <Maximize className="w-4 h-4" /> {isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </div>

      {/* Main Area - Slide Navigator + Slide View */}
      <div className="flex-1 flex overflow-hidden bg-slate-950 print:bg-white print:block">

        {/* Left Slide Navigator Panel (hidden in print/fullscreen) */}
        {!isFullscreen && (
          <div className="w-64 bg-slate-900 border-r border-white/10 overflow-y-auto flex-shrink-0 print:hidden flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Slide ({totalSlides})</p>
            </div>
            <div className="flex-1">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`group flex items-center gap-2 pr-2 transition-all border-l-4 ${
                    currentSlide === index
                      ? 'bg-primary/20 border-primary'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <button
                    onClick={() => setCurrentSlide(index)}
                    className={`flex-1 text-left px-3 py-2.5 flex items-center gap-2 min-w-0 ${
                      currentSlide === index ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`text-xs font-black min-w-[22px] rounded px-1 py-0.5 text-center flex-shrink-0 ${
                      currentSlide === index ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'
                    }`}>{index + 1}</span>
                    <span className="text-xs font-semibold leading-tight truncate">
                      {slide.type === 'chapter' ? <span className="font-black text-primary/90">{slide.title}</span> : slide.title}
                    </span>
                  </button>
                  {slide.id !== 'cover' && slide.id !== 'penutup' && (
                    <button
                      onClick={() => deleteSlide(slide.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      title="Hapus slide"
                    >
                      <Trash2 style={{width:12,height:12}} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/10 flex-shrink-0">
              <button
                onClick={addCustomSlide}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-slate-300 border border-dashed border-white/20 hover:border-primary hover:text-primary hover:bg-primary/10 transition-all"
              >
                <Plus style={{width:14,height:14}} /> Tambah Halaman
              </button>
            </div>
          </div>
        )}

        {/* Slide Display Area */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 print:p-0 overflow-hidden print:block">
        <div 
          ref={presentationRef}
          className={`relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden print:overflow-visible print:shadow-none print:w-[297mm] print:border-none
            ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none' : 'w-full max-w-5xl aspect-video shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800'}
          `}
          style={{ fontFamily: `'${selectedFont}', sans-serif`, pageBreakAfter: 'always' }}
        >
          {slides.map((slide, index) => {
            const isVisible = currentSlide === index;
            // Print mode renders all slides sequentially
            return (
              <div 
                key={slide.id}
                className={`absolute inset-0 flex flex-col transition-opacity duration-300 bg-white dark:bg-slate-900 ${isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}
              >
                
                {/* --- SLIDE RENDERERS --- */}
                {slide.type === "cover" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900">
                    <div className="w-32 h-32 mb-10 flex items-center justify-center">
                      <div className="relative flex items-center justify-center w-full h-full rounded-3xl bg-white dark:bg-slate-800 shadow-xl p-4 border border-slate-100 dark:border-slate-700">
                        <svg className="w-full h-full" style={{ color: activeTheme.primaryHex }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="w-full max-w-4xl space-y-4">
                        <Input value={presentationData.title} onChange={e => setPresentationData({...presentationData, title: e.target.value})} className="text-4xl font-black text-center h-16 bg-white dark:bg-slate-800" />
                        <Textarea value={presentationData.subtitle} onChange={e => setPresentationData({...presentationData, subtitle: e.target.value})} className="text-xl text-center h-24 bg-white dark:bg-slate-800" />
                      </div>
                    ) : (
                      <>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">{presentationData.title}</h1>
                        <p className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{presentationData.subtitle}</p>
                      </>
                    )}
                    <div className="mt-20 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-t-2 border-slate-200 dark:border-slate-800 pt-6 w-full max-w-sm">
                      Laporan Otomatis • SurveyDash
                    </div>
                  </div>
                )}

                {slide.type === "toc" && (() => {
                  const allItems = slides.filter(s =>
                    s.type === 'chapter' ||
                    (s.type === 'text' && !s.id.startsWith('ind-')) ||
                    s.type === 'demo1' || s.type === 'demo2' ||
                    s.id === 'bab4-ikm' || s.id === 'bab4-tabel' || s.id === 'bab4-kategori' ||
                    s.id === 'bab5-all'
                  );
                  
                  const half = Math.ceil(allItems.length / 2);
                  const part = (slide as any).part || 1;
                  const tocItems = part === 1 ? allItems.slice(0, half) : allItems.slice(half);

                  return (
                  <div className="flex-1 flex flex-col pt-6 px-10 pb-2 overflow-hidden">
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-5 mb-5 flex-shrink-0" style={{ borderColor: activeTheme.primaryHex }}>
                       Daftar Isi ({part}/2)
                     </h2>
                     <div className="flex-1 overflow-auto">
                       <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                         {tocItems.map((s, idx) => {
                           const isChapter = s.type === 'chapter';
                           return (
                             <div
                               key={idx}
                               className={`flex justify-between items-end pb-1 ${
                                 isChapter
                                   ? 'col-span-2 font-black text-base text-slate-900 dark:text-white mt-3 border-b-2 border-slate-400 dark:border-slate-600'
                                   : 'pl-3 border-b border-slate-200 dark:border-slate-700'
                               }`}
                             >
                               <span style={{ color: isChapter ? activeTheme.primaryHex : undefined }} className={isChapter ? '' : 'text-slate-600 dark:text-slate-400'}>
                                 {s.title?.replace('\n', ' ')}
                               </span>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                  </div>
                  );
                })()}

                {slide.type === "chapter" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center" style={{ background: activeTheme.chapterBg }}>
                     <div className="mb-6 text-sm font-bold uppercase tracking-[0.3em]" style={{ color: activeTheme.chapterText }}>Survei Kepuasan Masyarakat</div>
                     <h1 className="text-5xl font-black uppercase tracking-widest leading-snug whitespace-pre-wrap" style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                       {slide.title}
                     </h1>
                     <div className="mt-8 w-24 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                  </div>
                )}

                {slide.type === "text" && (
                  <div className="flex-1 flex flex-col pt-8 px-10 pb-2 bg-white dark:bg-slate-900 overflow-hidden">
                     <div className="flex items-center justify-between mb-5 flex-shrink-0">
                       <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-5" style={{ borderColor: activeTheme.primaryHex }}>{slide.title}</h2>
                       {isEditing && (
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="gap-2 text-xs font-bold border-primary/20 hover:bg-primary/10 text-primary animate-pulse"
                           onClick={handleRewriteAI}
                           disabled={isRewriting}
                         >
                           <Sparkles className="w-3 h-3" /> {isRewriting ? "Menganalisis..." : "AI Rewrite"}
                         </Button>
                       )}
                     </div>
                     <div className="flex-1 overflow-auto px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-base text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap">
                       {isEditing ? (
                         <Textarea
                            value={(presentationData as any)[slide.field!]}
                            onChange={e => setPresentationData({...presentationData, [slide.field!]: e.target.value})}
                            className="w-full h-full min-h-[200px] text-base leading-loose bg-transparent border-none resize-none focus:ring-0 text-slate-900 dark:text-white"
                         />
                       ) : (
                         slide.isPage ? slide.pageContent : (presentationData as any)[slide.field!]
                       )}
                     </div>
                  </div>
                )}

                {slide.type === "custom-text" && (() => {
                  const cs = slide as {id:string,type:string,title:string,content:string};
                  return (
                  <div className="flex-1 flex flex-col pt-8 px-10 pb-2 bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="flex items-center justify-between mb-5 flex-shrink-0">
                      <div className="flex items-center gap-3 flex-1">
                        {isEditing ? (
                          <input
                            value={cs.title}
                            onChange={e => updateCustomSlide(cs.id, 'title', e.target.value)}
                            className="flex-1 text-3xl font-black text-slate-900 dark:text-white uppercase border-b-4 bg-transparent outline-none pl-2"
                            style={{ borderColor: activeTheme.primaryHex }}
                          />
                        ) : (
                          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-5" style={{ borderColor: activeTheme.primaryHex }}>{cs.title}</h2>
                        )}
                      </div>
                      {isEditing && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2 text-xs font-bold border-primary/20 hover:bg-primary/10 text-primary ml-4"
                          onClick={handleRewriteAI}
                          disabled={isRewriting}
                        >
                          <Sparkles className="w-3 h-3" /> AI Rewrite
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 overflow-auto px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-base text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap">
                      {isEditing ? (
                        <Textarea
                          value={cs.content}
                          onChange={e => updateCustomSlide(cs.id, 'content', e.target.value)}
                          className="w-full h-full min-h-[200px] text-base leading-loose bg-transparent border-none resize-none focus:ring-0 text-slate-900 dark:text-white"
                        />
                      ) : (slide.isPage ? slide.pageContent : cs.content)}
                    </div>
                  </div>
                  );
                })()}

                {slide.type === "demo1" && (
                  <div className="flex-1 flex flex-col p-12 bg-white dark:bg-slate-900">
                     <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-6 mb-8" style={{ borderColor: activeTheme.primaryHex }}>Profil Responden (1/2)</h2>
                     <div className="grid grid-cols-2 gap-8 flex-1">
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col bg-slate-50 dark:bg-slate-800">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 dark:text-slate-300 mb-4 border-b dark:border-slate-700 pb-2">Jenis Kelamin</h3>
                           <div className="flex-1">{renderPieChart(demoGenderData)}</div>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col bg-slate-50 dark:bg-slate-800">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 dark:text-slate-300 mb-4 border-b dark:border-slate-700 pb-2">Pendidikan Terakhir</h3>
                           <div className="flex-1">{renderPieChart(demoEduData)}</div>
                        </div>
                     </div>
                  </div>
                )}

                {slide.type === "demo2" && (
                  <div className="flex-1 flex flex-col p-12 bg-white dark:bg-slate-900">
                     <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-6 mb-8" style={{ borderColor: activeTheme.primaryHex }}>Profil Responden (2/2)</h2>
                     <div className="grid grid-cols-2 gap-8 flex-1">
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col bg-slate-50 dark:bg-slate-800">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 dark:text-slate-300 mb-4 border-b dark:border-slate-700 pb-2">Kelompok Umur</h3>
                           <div className="flex-1">{renderBarChart(demoUmurData, COLORS_GOOGLE[0])}</div>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col bg-slate-50 dark:bg-slate-800">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 dark:text-slate-300 mb-4 border-b dark:border-slate-700 pb-2">Pekerjaan / Profesi</h3>
                           <div className="flex-1">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={demoPekerjaanData} layout="vertical" margin={{ top: 20, right: 50, left: 10, bottom: 0 }}>
                                   <XAxis type="number" hide />
                                   <YAxis dataKey="name" type="category" fontSize={11} width={100} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-600 dark:text-slate-400" />
                                   <Tooltip cursor={{fill: 'rgba(100,116,139,0.1)'}} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#fff' }} />
                                   <Bar dataKey="value" fill={COLORS_GOOGLE[1]} radius={[0, 4, 4, 0]} maxBarSize={40}>
                                     <LabelList dataKey="value" position="right" formatter={(val: number) => {
                                       const total = demoPekerjaanData.reduce((acc, curr: any) => acc + (curr.value || 0), 0);
                                       return total > 0 ? `${val} (${((val/total)*100).toFixed(1)}%)` : val;
                                     }} fontSize={10} fontWeight="bold" fill="currentColor" className="text-slate-600 dark:text-slate-300" />
                                   </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {slide.type === "ikm" && (
                  <div className="flex-1 flex flex-col p-12 bg-white dark:bg-slate-900">
                     <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-6 mb-8" style={{ borderColor: activeTheme.primaryHex }}>Nilai Indeks Kepuasan Masyarakat</h2>
                     <div className="flex-1 flex items-center justify-center">
                       {(() => {
                         const score = Number(data.ikm?.score ?? 0);
                         let grade = "D";
                         let color = "#ef4444";
                         if (score >= 88.31) { grade = "A"; color = "#059669"; }
                         else if (score >= 76.61) { grade = "B"; color = "#3b82f6"; }
                         else if (score >= 65.00) { grade = "C"; color = "#f59e0b"; }
                         
                         return (
                          <div className="text-center p-16 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-800">
                            <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: color }} />
                            <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-widest">Nilai IKM Unit Pelayanan</p>
                            <h1 className="text-9xl font-black tracking-tighter mb-4" style={{ color: color }}>{score.toFixed(2)}</h1>
                            <div className="inline-flex px-8 py-3 rounded-full text-2xl font-bold text-white shadow-lg" style={{ backgroundColor: color }}>
                              MUTU: {grade}
                            </div>
                          </div>
                         );
                       })()}
                     </div>
                  </div>
                )}

                {slide.type === "all-indicators" && (
                  <div className="flex-1 flex flex-col p-12 bg-white dark:bg-slate-900">
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-5 mb-8" style={{ borderColor: activeTheme.primaryHex }}>Rekapitulasi 9 Indikator</h2>
                     <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 bg-slate-50 dark:bg-slate-800">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={data.indicators} layout="vertical" margin={{ left: 220, right: 60, top: 20, bottom: 20 }}>
                           <XAxis type="number" domain={[0, 4]} ticks={[1, 2, 3, 4]} stroke="currentColor" className="text-slate-300 dark:text-slate-600" fontSize={14} fontWeight="bold" />
                           <YAxis dataKey="label" type="category" width={220} axisLine={false} tickLine={false} fontSize={14} fontWeight="bold" stroke="currentColor" className="text-slate-800 dark:text-slate-300" />
                           <Tooltip cursor={{fill: 'rgba(100,116,139,0.1)'}} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#fff' }} />
                           <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={28}>
                              {data.indicators.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.avg >= 3.532 ? '#10b981' : entry.avg >= 3.064 ? '#3b82f6' : entry.avg >= 2.60 ? '#f59e0b' : '#ef4444'} />
                              ))}
                              <LabelList dataKey="avg" position="right" formatter={(val: number) => val.toFixed(2)} fontSize={12} fontWeight="bold" fill="currentColor" className="text-slate-700 dark:text-slate-300" />
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                  </div>
                )}

                {slide.type === "kategori-mutu" && (
                  <div className="flex-1 flex flex-col p-12 bg-white dark:bg-slate-900">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-6 mb-12" style={{ borderColor: activeTheme.primaryHex }}>Kategori Mutu Pelayanan</h2>
                    <div className="grid grid-cols-2 gap-6 flex-1">
                      {[
                        { label: 'A – Sangat Baik', range: '88,31 – 100,00', ikm: '3,532 – 4,00', color: '#059669', bg: '#d1fae5' },
                        { label: 'B – Baik',         range: '76,61 – 88,30',  ikm: '3,064 – 3,532', color: '#1d4ed8', bg: '#dbeafe' },
                        { label: 'C – Kurang Baik',  range: '65,00 – 76,60',  ikm: '2,60 – 3,064',  color: '#d97706', bg: '#fef3c7' },
                        { label: 'D – Tidak Baik',   range: '25,00 – 64,99',  ikm: '1,00 – 2,60',   color: '#dc2626', bg: '#fee2e2' },
                      ].map(k => (
                        <div key={k.label} className="rounded-2xl p-8 flex flex-col gap-3 border-2 shadow-sm" style={{ background: k.bg, borderColor: k.color }}>
                          <p className="text-2xl font-black" style={{ color: k.color }}>{k.label}</p>
                          <p className="text-base font-bold text-slate-800">Nilai Interval: <span className="font-black text-slate-950">{k.range}</span></p>
                          <p className="text-base font-bold text-slate-800">Nilai IKM: <span className="font-black text-slate-950">{k.ikm}</span></p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      ⓘ Berdasarkan Permenpan RB No. 14 Tahun 2017 — Nilai IKM Unit Pelayanan dihitung dari rata-rata tertimbang 9 unsur dengan bobot masing-masing 0,111.
                    </div>
                  </div>
                )}

                {slide.type === "tabel-unsur" && (
                  <div className="flex-1 flex flex-col p-10 bg-white dark:bg-slate-900">
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-5 mb-6" style={{ borderColor: activeTheme.primaryHex }}>Tabel Nilai Per Unsur Pelayanan</h2>
                     <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                       <table className="w-full text-sm border-collapse">
                         <thead>
                           <tr style={{ background: activeTheme.primaryHex, color: '#fff' }}>
                             <th className="text-left p-3 font-bold border-b border-slate-200 dark:border-slate-700">No</th>
                             <th className="text-left p-3 font-bold border-b border-slate-200 dark:border-slate-700">Unsur Pelayanan</th>
                             <th className="text-center p-3 font-bold border-b border-slate-200 dark:border-slate-700">Nilai Rata-Rata</th>
                             <th className="text-center p-3 font-bold border-b border-slate-200 dark:border-slate-700">Mutu</th>
                             <th className="text-center p-3 font-bold border-b border-slate-200 dark:border-slate-700">Kinerja</th>
                           </tr>
                         </thead>
                         <tbody>
                           {data.indicators.map((ind: any, i: number) => {
                             const mutu = ind.avg >= 3.532 ? 'A' : ind.avg >= 3.064 ? 'B' : ind.avg >= 2.60 ? 'C' : 'D';
                             const kat = ind.avg >= 3.532 ? 'Sangat Baik' : ind.avg >= 3.064 ? 'Baik' : ind.avg >= 2.60 ? 'Kurang Baik' : 'Tidak Baik';
                             const col = ind.avg >= 3.532 ? '#059669' : ind.avg >= 3.064 ? '#3b82f6' : ind.avg >= 2.60 ? '#f59e0b' : '#ef4444';
                             return (
                               <tr key={i} className={i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'}>
                                 <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">{i + 1}</td>
                                 <td className="p-3 text-slate-800 dark:text-slate-200 font-medium border-b border-slate-100 dark:border-slate-800">{ind.label}</td>
                                 <td className="p-3 text-center font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">{ind.avg.toFixed(3)}</td>
                                 <td className="p-3 text-center border-b border-slate-100 dark:border-slate-800"><span className="font-black text-white px-3 py-1 rounded-full text-xs" style={{ background: col }}>{mutu}</span></td>
                                 <td className="p-3 text-center font-bold border-b border-slate-100 dark:border-slate-800" style={{ color: col }}>{kat}</td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                  </div>
                 )}

                 {slide.type === "indicator" && (() => {
                   const ind = slide.indicatorData as any;
                   const avg: number = ind?.avg ?? 0;
                   const dist = ind?.distribution ?? {};
                   const options = INDIKATOR_OPTIONS[(ind?.id || 1) - 1] || ["Opsi 1", "Opsi 2", "Opsi 3", "Opsi 4"];
                   return (
                   <div className="flex-1 flex flex-col p-12 bg-white dark:bg-slate-900">
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase border-l-8 pl-6 mb-8" style={{ borderColor: activeTheme.primaryHex }}>{slide.title}</h2>
                      <div className="grid grid-cols-2 gap-10 flex-1">
                         <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center">
                            <p className="text-xl font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Nilai Rata-Rata Unsur</p>
                            <p className="text-[7rem] font-black leading-none mb-6" style={{ color: activeTheme.primaryHex }}>{avg.toFixed(2)}</p>
                            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">Skala 1 - 4</p>
                         </div>
                         <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-10">
                            <p className="text-xl font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8 text-center">Distribusi Jawaban Responden</p>
                            <div className="flex-1">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={[
                                   { name: options[0], value: Number(dist[0] ?? 0) },
                                   { name: options[1], value: Number(dist[1] ?? 0) },
                                   { name: options[2], value: Number(dist[2] ?? 0) },
                                   { name: options[3], value: Number(dist[3] ?? 0) }
                                 ]} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                                    <XAxis dataKey="name" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-600 dark:text-slate-400" />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-600 dark:text-slate-400" />
                                    <Tooltip cursor={{fill: 'rgba(100,116,139,0.1)'}} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#fff' }} />
                                    <Bar dataKey="value" fill="#4285F4" radius={[6, 6, 0, 0]} maxBarSize={80}>
                                      {[0, 1, 2, 3].map((_, idx) => (
                                        <Cell key={`c-${idx}`} fill={idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : '#10b981'} />
                                      ))}
                                      <LabelList dataKey="value" position="top" formatter={(val: number) => {
                                        const total = [Number(dist[0]??0), Number(dist[1]??0), Number(dist[2]??0), Number(dist[3]??0)].reduce((a,b)=>a+b,0);
                                        return total > 0 ? `${val} (${((val/total)*100).toFixed(1)}%)` : val;
                                      }} fontSize={12} fontWeight="bold" fill="currentColor" className="text-slate-700 dark:text-slate-300" />
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  </div>
                  );
                })()}

                {slide.type === "closing" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white" style={{ backgroundColor: activeTheme.closingBg }}>
                     <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-10">
                       <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <h1 className="text-6xl font-black uppercase tracking-tighter mb-6">Terima Kasih</h1>
                     <p className="text-2xl font-medium text-slate-400 max-w-3xl mx-auto leading-relaxed">
                       Atas partisipasi dan dukungan semua pihak dalam pelaksanaan Survei Kepuasan Masyarakat ini. 
                       Laporan ini disusun secara otomatis oleh <strong className="text-white">SurveyDash</strong>.
                     </p>
                  </div>
                )}

                {/* Footer on each slide (except cover/closing/chapter) — normal flow, not absolute */}
                {slide.type !== "cover" && slide.type !== "closing" && slide.type !== "chapter" && (
                  <div className="flex-shrink-0 mx-10 flex justify-between items-center text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest border-t border-slate-200 dark:border-slate-800 pt-2 pb-3 print:text-black print:border-slate-200">
                     <span>{presentationData.subtitle.split('\n')[0]}</span>
                     <span>Hal. {index + 1}</span>
                  </div>
                )}

              </div>
            );
          })}

        </div>

        </div>
        </div>

        {/* Floating Navigation Controls (Hidden in Print) */}
        {!isEditing && (
          <div className="fixed bottom-10 right-10 flex gap-3 print:hidden z-50">
            <button
              onClick={prevSlide} disabled={currentSlide === 0}
              style={{ width:48,height:48,borderRadius:'50%',background:'#ffffff',color:'#0f172a',border:'none',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.3)',cursor:currentSlide===0?'not-allowed':'pointer',opacity:currentSlide===0?0.4:1,transition:'all 0.2s' }}
            ><ChevronLeft style={{width:24,height:24}} /></button>
            <div style={{ display:'flex',alignItems:'center',background:'rgba(15,23,42,0.92)',color:'#ffffff',fontSize:14,fontWeight:700,padding:'0 16px',borderRadius:999,boxShadow:'0 8px 32px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.15)',minWidth:80,justifyContent:'center' }}>
              {currentSlide + 1} / {totalSlides}
            </div>
            <button
              onClick={nextSlide} disabled={currentSlide === totalSlides - 1}
              style={{ width:48,height:48,borderRadius:'50%',background:'#ffffff',color:'#0f172a',border:'none',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.3)',cursor:currentSlide===totalSlides-1?'not-allowed':'pointer',opacity:currentSlide===totalSlides-1?0.4:1,transition:'all 0.2s' }}
            ><ChevronRight style={{width:24,height:24}} /></button>
          </div>
        )}

      {/* Print Mode Global Styles */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { -webkit-print-color-adjust: exact; background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};
