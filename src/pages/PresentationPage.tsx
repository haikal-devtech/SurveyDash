import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SurveyConfig, SurveyData } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Download, Edit3, Save, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

const COLORS_GOOGLE = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043', '#9E9D24', '#5C6BC0'];

export const PresentationPage: React.FC = () => {
  const { id } = useParams();
  const { role } = useAuth();
  
  const [config, setConfig] = useState<SurveyConfig | null>(null);
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [showFontMenu, setShowFontMenu] = useState(false);

  const totalSlidesRef = useRef(0); // kept for legacy, primary nav uses useMemo below
  
  // Editable Comprehensive Content State
  const [presentationData, setPresentationData] = useState({
    title: "LAPORAN HASIL SURVEI KEPUASAN MASYARAKAT",
    subtitle: "", // will be auto-filled with agency and period
    kataPengantar: "Puji syukur ke hadirat Tuhan Yang Maha Esa atas rahmat dan karunia-Nya, sehingga Laporan Hasil Survei Kepuasan Masyarakat (SKM) ini dapat diselesaikan dengan baik.\n\nPelaksanaan Survei Kepuasan Masyarakat ini merupakan wujud nyata komitmen instansi kami dalam meningkatkan kualitas pelayanan publik sejalan dengan Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (Permenpan RB). Laporan ini merangkum hasil evaluasi persepsi masyarakat terhadap 9 unsur pelayanan yang kami berikan.\n\nKami menyadari bahwa laporan ini masih memiliki banyak kekurangan. Oleh karena itu, masukan dan saran yang membangun sangat kami harapkan guna penyempurnaan di masa yang akan datang.",
    latarBelakang: "Seiring dengan tuntutan masyarakat terhadap pelayanan publik yang prima, instansi pemerintah dituntut untuk selalu berinovasi dan memperbaiki kualitas layanannya. Survei Kepuasan Masyarakat (SKM) dilaksanakan sebagai alat ukur yang objektif untuk mengetahui tingkat kinerja unit pelayanan instansi pemerintah secara berkala.\n\nPelaksanaan survei ini mengacu pada standar operasional dan tata kelola yang transparan, guna mengidentifikasi area yang membutuhkan perbaikan (area of improvement) serta mempertahankan aspek pelayanan yang telah berjalan dengan baik.",
    maksudTujuan: "Maksud:\nMengukur tingkat kepuasan masyarakat sebagai pengguna layanan dalam rangka peningkatan kualitas penyelenggaraan pelayanan publik.\n\nTujuan:\n1. Mendorong partisipasi masyarakat sebagai pengguna layanan dalam menilai kinerja penyelenggara pelayanan.\n2. Mendorong penyelenggara pelayanan untuk meningkatkan kualitas pelayanan publik.\n3. Mendorong penyelenggara pelayanan menjadi lebih inovatif dalam menyelenggarakan pelayanan publik.\n4. Mengukur kecenderungan tingkat kepuasan masyarakat terhadap penyelenggaraan pelayanan publik.",
    ruangLingkup: "Ruang lingkup pelaksanaan Survei Kepuasan Masyarakat ini mencakup 9 (sembilan) unsur pelayanan sesuai Permenpan RB, yaitu:\n1. Persyaratan\n2. Sistem, Mekanisme, dan Prosedur\n3. Waktu Penyelesaian\n4. Biaya/Tarif\n5. Produk Spesifikasi Jenis Pelayanan\n6. Kompetensi Pelaksana\n7. Perilaku Pelaksana\n8. Penanganan Pengaduan, Saran, dan Masukan\n9. Sarana dan Prasarana\n\nSasaran: Seluruh penerima layanan yang mengurus perizinan/rekomendasi pada periode survei.",
    visiMisi: "VISI:\n[Masukkan Visi Instansi Anda di Sini]\n\nMISI:\n1. [Masukkan Misi 1]\n2. [Masukkan Misi 2]\n3. [Masukkan Misi 3]\n\n(Silakan edit bagian ini sesuai dengan Visi & Misi Instansi Anda)",
    maklumat: "MAKLUMAT PELAYANAN:\n\n\"Kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan apabila tidak menepati janji ini, kami siap menerima sanksi sesuai peraturan perundang-undangan yang berlaku.\"",
    metodologi: "1. Pendekatan dan Metode:\nPenelitian ini menggunakan pendekatan kuantitatif dengan metode deskriptif. Pengumpulan data dilakukan melalui kuesioner mandiri yang diisi oleh responden.\n\n2. Populasi dan Sampel:\nPopulasi adalah seluruh masyarakat yang menerima layanan pada periode survei. Penarikan sampel menggunakan metode accidental sampling, di mana responden yang kebetulan ditemui atau sedang menerima layanan diminta untuk mengisi kuesioner.\n\n3. Teknik Pengumpulan Data:\nPengumpulan data dilakukan secara digital (E-Survey) yang terintegrasi secara real-time ke dalam sistem database.",
    lokasiWaktu: "Lokasi Survei:\nSurvei dilakukan di lingkungan unit pelayanan instansi kami secara langsung maupun daring (online).\n\nWaktu Pelaksanaan:\nPengumpulan data dilakukan selama periode [Periode] dengan melibatkan masyarakat yang secara langsung menerima layanan.",
    kesimpulan: "Berdasarkan hasil pengolahan data Survei Kepuasan Masyarakat, dapat disimpulkan bahwa:\n1. Kinerja pelayanan instansi secara umum berada pada kategori MUTU BAIK.\n2. Terdapat beberapa unsur pelayanan yang mendapatkan apresiasi tinggi dari masyarakat, menunjukkan komitmen kuat dalam menjaga kualitas layanan.\n3. Masih terdapat beberapa aspek yang perlu ditingkatkan, khususnya terkait dengan kecepatan respons dan fasilitas penunjang.",
    rekomendasi: "Sebagai tindak lanjut dari hasil survei ini, direkomendasikan:\n1. Mempertahankan dan meningkatkan standar operasional prosedur yang sudah berjalan baik.\n2. Melakukan evaluasi berkala terhadap unsur layanan dengan nilai terendah.\n3. Mengadakan pelatihan capacity building bagi petugas layanan garda terdepan (frontliner).\n4. Meningkatkan kualitas sarana dan prasarana ruang tunggu dan fasilitas difabel.",
    landasanHukum: "Pelaksanaan SKM ini berlandaskan:\n1. UU No. 25 Tahun 2009 tentang Pelayanan Publik.\n2. PP No. 96 Tahun 2012 tentang Pelaksanaan UU Pelayanan Publik.\n3. Permenpan RB No. 14 Tahun 2017 tentang Pedoman SKM Unit Penyelenggara Pelayanan Publik.\n4. Perda setempat tentang Penyelenggaraan Pelayanan Publik.",
    profilInstansi: "[Nama Instansi] merupakan perangkat daerah yang menyelenggarakan sub urusan penanggulangan bencana.\n\nTugas pokok instansi adalah membantu Kepala Daerah dalam menyelenggarakan urusan pemerintahan di bidang kebencanaan, perlindungan masyarakat, dan pelayanan publik terkait kebencanaan.\n\nInstansi berkomitmen untuk terus meningkatkan kualitas pelayanan kepada masyarakat secara profesional, transparan, dan akuntabel.",
    tupoksi: "TUGAS POKOK:\nMelaksanakan urusan pemerintahan daerah berdasarkan asas otonomi di bidang penanggulangan bencana dan perlindungan masyarakat.\n\nFUNGSI:\n1. Penyusunan kebijakan teknis di bidang kebencanaan.\n2. Pelaksanaan tugas dukungan teknis pencegahan dan penanggulangan bencana.\n3. Pemantauan, evaluasi, dan pelaporan hasil pelaksanaan tugas.\n4. Pembinaan teknis penyelenggaraan fungsi penunjang urusan pemerintahan daerah.",
    populasiSampel: "POPULASI:\nSeluruh masyarakat yang menerima layanan pada unit pelayanan instansi selama periode survei.\n\nSAMPEL:\nPengambilan sampel menggunakan metode Accidental Sampling dengan formula Slovin. Jumlah sampel minimal ditetapkan sesuai Permenpan RB No. 14 Tahun 2017, yakni minimal 25 responden per jenis layanan.\n\nKRITERIA INKLUSI:\n- Warga Negara Indonesia berusia minimal 17 tahun.\n- Telah mendapatkan pelayanan pada periode survei.",
    teknikAnalisis: "PENGOLAHAN DATA:\nData yang terkumpul diolah menggunakan sistem komputerisasi. Nilai Indeks Kepuasan Masyarakat (IKM) dihitung berdasarkan rata-rata tertimbang dari 9 unsur pelayanan.\n\nRUMUS IKM:\nNilai IKM = (Total Nilai Persepsi Per Unsur / Total Unsur yang Terisi) × Nilai Penimbang\nNilai Penimbang = 1/9 = 0,111\n\nKATEGORI MUTU:\n• A (Sangat Baik) : 88,31 – 100,00\n• B (Baik)        : 76,61 – 88,30\n• C (Kurang Baik) : 65,00 – 76,60\n• D (Tidak Baik)  : 25,00 – 64,99",
    daftarPustaka: "1. Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik.\n2. Peraturan Pemerintah Nomor 96 Tahun 2012.\n3. Permenpan RB Nomor 14 Tahun 2017 tentang Pedoman Penyusunan Survei Kepuasan Masyarakat.\n4. Sinambela, L.P. (2016). Reformasi Pelayanan Publik. Jakarta: Bumi Aksara.\n5. Tjiptono, F. (2014). Pemasaran Jasa. Yogyakarta: Penerbit Andi."
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
          setPresentationData(prev => ({
            ...prev,
            subtitle: `${cfg.agency}\nPeriode: ${cfg.period}`
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

  // ── Slides (useMemo — must be before any early return) ───────────────────────
  const slides = useMemo(() => {
    if (!data) return [] as any[];
    const s: any[] = [
      { id: "cover",            type: "cover",          title: "Cover" },
      { id: "kata-pengantar",   type: "text",           title: "Kata Pengantar",              field: "kataPengantar" },
      { id: "daftar-isi",       type: "toc",            title: "Daftar Isi" },
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
    data.indicators.forEach((ind, i) => {
      s.push({ id: `ind-${i}`, type: "indicator", title: `Analisis: ${ind.label}`, indicatorData: ind });
    });
    s.push({ id: "bab6-title",       type: "chapter", title: "BAB VI\nKesimpulan & Rekomendasi" });
    s.push({ id: "bab6-kesimpulan",  type: "text",    title: "Kesimpulan",            field: "kesimpulan" });
    s.push({ id: "bab6-rekomendasi", type: "text",    title: "Rencana Tindak Lanjut", field: "rekomendasi" });
    s.push({ id: "daftar-pustaka",   type: "text",    title: "Daftar Pustaka",        field: "daftarPustaka" });
    s.push({ id: "penutup",          type: "closing", title: "Penutup" });
    return s;
  }, [data]);

  const totalSlides = slides.length;
  totalSlidesRef.current = totalSlides;

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
        <Pie data={chartData} cx={cx} cy="50%" outerRadius={110} dataKey="value" stroke="white" strokeWidth={2}>
          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_GOOGLE[index % COLORS_GOOGLE.length]} />)}
        </Pie>
        <Tooltip />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', right: 0 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (chartData: any[], color: string) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={60} />
      </BarChart>
    </ResponsiveContainer>
  );

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
          {/* Font Selector */}
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
          <div className="w-56 bg-slate-900 border-r border-white/10 overflow-y-auto flex-shrink-0 print:hidden">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest px-4 pt-4 pb-2">Slide ({totalSlides})</p>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-l-4 ${
                  currentSlide === index
                    ? 'bg-primary/20 border-primary text-white'
                    : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className={`text-xs font-black min-w-[24px] rounded-md px-1.5 py-0.5 text-center ${
                  currentSlide === index ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'
                }`}>{index + 1}</span>
                <span className="text-xs font-semibold leading-tight truncate">
                  {slide.type === 'chapter' ? <span className="font-black text-primary/90">{slide.title}</span> : slide.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Slide Display Area */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 print:p-0 overflow-hidden print:block">
        <div 
          ref={presentationRef}
          className={`relative bg-white text-slate-900 overflow-hidden print:overflow-visible print:shadow-none print:w-[297mm] print:border-none
            ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none' : 'w-full max-w-5xl aspect-video shadow-2xl rounded-xl border border-border'}
          `}
          style={{ fontFamily: `'${selectedFont}', sans-serif`, pageBreakAfter: 'always' }}
        >
          {slides.map((slide, index) => {
            const isVisible = currentSlide === index;
            // Print mode renders all slides sequentially
            return (
              <div 
                key={slide.id}
                className={`absolute inset-0 flex flex-col transition-opacity duration-300 bg-white ${isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}
              >
                
                {/* --- SLIDE RENDERERS --- */}
                {slide.type === "cover" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-slate-50 to-slate-200">
                    <div className="w-32 h-32 mb-10 flex items-center justify-center">
                      <div className="relative flex items-center justify-center w-full h-full rounded-3xl bg-white shadow-xl p-4 border border-slate-100">
                        <svg className="w-full h-full text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="w-full max-w-4xl space-y-4">
                        <Input value={presentationData.title} onChange={e => setPresentationData({...presentationData, title: e.target.value})} className="text-4xl font-black text-center h-16" />
                        <Textarea value={presentationData.subtitle} onChange={e => setPresentationData({...presentationData, subtitle: e.target.value})} className="text-xl text-center h-24" />
                      </div>
                    ) : (
                      <>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 uppercase tracking-tight mb-6">{presentationData.title}</h1>
                        <p className="text-xl md:text-2xl font-bold text-slate-600 whitespace-pre-wrap">{presentationData.subtitle}</p>
                      </>
                    )}
                    <div className="mt-20 text-sm font-bold text-slate-400 uppercase tracking-widest border-t-2 border-slate-200 pt-6 w-full max-w-sm">
                      Laporan Otomatis • SurveyDash
                    </div>
                  </div>
                )}

                {slide.type === "toc" && (
                  <div className="flex-1 flex flex-col p-12">
                     <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-12">Daftar Isi</h2>
                     <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-lg font-medium text-slate-700 pl-6">
                        {slides.filter(s => s.type === "chapter" || s.type === "text" || s.id === "bab4-ikm").map((s, idx) => (
                           <div key={idx} className={`flex justify-between border-b border-slate-200 pb-2 ${s.type === 'chapter' ? 'col-span-2 font-bold text-xl mt-4 border-slate-400' : 'pl-4'}`}>
                             <span>{s.title?.replace('\n', ' ')}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                )}

                {slide.type === "chapter" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)' }}>
                     <div className="mb-6 text-blue-300 text-sm font-bold uppercase tracking-[0.3em]">Survei Kepuasan Masyarakat</div>
                     <h1 className="text-5xl font-black uppercase tracking-widest leading-snug whitespace-pre-wrap" style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                       {slide.title}
                     </h1>
                     <div className="mt-8 w-24 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                  </div>
                )}

                {slide.type === "text" && (
                  <div className="flex-1 flex flex-col p-12 bg-white">
                     <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">{slide.title}</h2>
                     <div className="flex-1 p-8 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm text-lg text-slate-800 leading-loose whitespace-pre-wrap">
                       {isEditing ? (
                         <Textarea 
                            value={(presentationData as any)[slide.field!]} 
                            onChange={e => setPresentationData({...presentationData, [slide.field!]: e.target.value})} 
                            className="w-full h-full min-h-[300px] text-lg leading-loose" 
                         />
                       ) : (
                         (presentationData as any)[slide.field!]
                       )}
                     </div>
                  </div>
                )}

                {slide.type === "demo1" && (
                  <div className="flex-1 flex flex-col p-12 bg-white">
                     <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">Profil Responden (1/2)</h2>
                     <div className="grid grid-cols-2 gap-8 flex-1">
                        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col bg-slate-50">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 mb-4 border-b pb-2">Jenis Kelamin</h3>
                           <div className="flex-1">{renderPieChart(demoGenderData)}</div>
                        </div>
                        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col bg-slate-50">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 mb-4 border-b pb-2">Pendidikan Terakhir</h3>
                           <div className="flex-1">{renderPieChart(demoEduData)}</div>
                        </div>
                     </div>
                  </div>
                )}

                {slide.type === "demo2" && (
                  <div className="flex-1 flex flex-col p-12 bg-white">
                     <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">Profil Responden (2/2)</h2>
                     <div className="grid grid-cols-2 gap-8 flex-1">
                        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col bg-slate-50">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 mb-4 border-b pb-2">Kelompok Umur</h3>
                           <div className="flex-1">{renderBarChart(demoUmurData, COLORS_GOOGLE[0])}</div>
                        </div>
                        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col bg-slate-50">
                           <h3 className="text-center font-black text-lg uppercase text-slate-700 mb-4 border-b pb-2">Pekerjaan / Profesi</h3>
                           <div className="flex-1">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={demoPekerjaanData} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                                   <XAxis type="number" hide />
                                   <YAxis dataKey="name" type="category" fontSize={11} width={100} tickLine={false} axisLine={false} />
                                   <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                   <Bar dataKey="value" fill={COLORS_GOOGLE[1]} radius={[0, 4, 4, 0]} maxBarSize={40} />
                                </BarChart>
                             </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {slide.type === "ikm" && (
                  <div className="flex-1 flex flex-col p-12 bg-white">
                     <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-12">Indeks Kepuasan Masyarakat (IKM)</h2>
                     <div className="flex flex-1 items-center justify-center gap-12">
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center shadow-lg w-1/2">
                          <p className="text-xl font-bold text-slate-500 uppercase tracking-widest mb-6">Total Responden</p>
                          <p className="text-[6rem] font-black text-slate-900 leading-none">{data.meta.total_respondents}</p>
                          <p className="text-2xl font-bold text-slate-400 mt-2">Masyarakat</p>
                        </div>
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-3xl p-12 text-center shadow-xl w-1/2 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5">
                            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4l7.5 13h-15L12 6z"/></svg>
                          </div>
                          <p className="text-xl font-bold text-primary uppercase tracking-widest mb-6">Nilai IKM Unit Pelayanan</p>
                          <p className="text-[8rem] font-black text-slate-900 leading-none mb-6">{data.ikm.score.toFixed(2)}</p>
                          <div className="inline-block px-8 py-3 bg-slate-900 text-white rounded-full text-3xl font-black uppercase tracking-widest shadow-md">
                            Mutu: {data.ikm.category}
                          </div>
                        </div>
                     </div>
                  </div>
                )}

                {slide.type === "all-indicators" && (
                  <div className="flex-1 flex flex-col p-12 bg-white">
                     <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">Rekapitulasi 9 Indikator</h2>
                     <div className="flex-1 border border-slate-200 rounded-2xl p-8 bg-slate-50">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={data.indicators} layout="vertical" margin={{ left: 220, right: 40, top: 20, bottom: 20 }}>
                           <XAxis type="number" domain={[0, 4]} ticks={[1, 2, 3, 4]} stroke="#cbd5e1" fontSize={14} fontWeight="bold" />
                           <YAxis dataKey="label" type="category" width={220} axisLine={false} tickLine={false} fontSize={14} fontWeight="bold" fill="#334155" />
                           <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                           <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={28}>
                              {data.indicators.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.avg >= 3.532 ? '#10b981' : entry.avg >= 3.064 ? '#3b82f6' : entry.avg >= 2.60 ? '#f59e0b' : '#ef4444'} />
                              ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                  </div>
                )}

                {slide.type === "kategori-mutu" && (
                  <div className="flex-1 flex flex-col p-10 bg-white">
                    <h2 className="text-3xl font-black text-slate-900 uppercase border-l-8 border-primary pl-5 mb-8">Kategori Mutu Pelayanan</h2>
                    <div className="grid grid-cols-2 gap-6 flex-1">
                      {[
                        { label: 'A – Sangat Baik', range: '88,31 – 100,00', ikm: '3,532 – 4,00', color: '#059669', bg: '#d1fae5' },
                        { label: 'B – Baik',         range: '76,61 – 88,30',  ikm: '3,064 – 3,532', color: '#1d4ed8', bg: '#dbeafe' },
                        { label: 'C – Kurang Baik',  range: '65,00 – 76,60',  ikm: '2,60 – 3,064',  color: '#d97706', bg: '#fef3c7' },
                        { label: 'D – Tidak Baik',   range: '25,00 – 64,99',  ikm: '1,00 – 2,60',   color: '#dc2626', bg: '#fee2e2' },
                      ].map(k => (
                        <div key={k.label} className="rounded-2xl p-8 flex flex-col gap-3 border-2" style={{ background: k.bg, borderColor: k.color }}>
                          <p className="text-2xl font-black" style={{ color: k.color }}>{k.label}</p>
                          <p className="text-base font-bold text-slate-700">Nilai Interval: <span className="font-black text-slate-900">{k.range}</span></p>
                          <p className="text-base font-bold text-slate-700">Nilai IKM: <span className="font-black text-slate-900">{k.ikm}</span></p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 font-medium">
                      ⓘ Berdasarkan Permenpan RB No. 14 Tahun 2017 — Nilai IKM Unit Pelayanan dihitung dari rata-rata tertimbang 9 unsur dengan bobot masing-masing 0,111.
                    </div>
                  </div>
                )}

                {slide.type === "tabel-unsur" && (
                  <div className="flex-1 flex flex-col p-10 bg-white">
                     <h2 className="text-3xl font-black text-slate-900 uppercase border-l-8 border-blue-700 pl-5 mb-6">Tabel Nilai Per Unsur Pelayanan</h2>
                     <div className="flex-1 overflow-auto">
                       <table className="w-full text-sm border-collapse">
                         <thead>
                           <tr style={{ background: '#1e40af', color: '#fff' }}>
                             <th className="text-left p-3 font-bold">No</th>
                             <th className="text-left p-3 font-bold">Unsur Pelayanan</th>
                             <th className="text-center p-3 font-bold">Nilai Rata-Rata</th>
                             <th className="text-center p-3 font-bold">Mutu</th>
                             <th className="text-center p-3 font-bold">Kinerja</th>
                           </tr>
                         </thead>
                         <tbody>
                           {data.indicators.map((ind: any, i: number) => {
                             const mutu = ind.avg >= 3.532 ? 'A' : ind.avg >= 3.064 ? 'B' : ind.avg >= 2.60 ? 'C' : 'D';
                             const kat = ind.avg >= 3.532 ? 'Sangat Baik' : ind.avg >= 3.064 ? 'Baik' : ind.avg >= 2.60 ? 'Kurang Baik' : 'Tidak Baik';
                             const col = ind.avg >= 3.532 ? '#059669' : ind.avg >= 3.064 ? '#1e40af' : ind.avg >= 2.60 ? '#d97706' : '#dc2626';
                             return (
                               <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                 <td className="p-3 text-center font-bold text-slate-600">{i + 1}</td>
                                 <td className="p-3 text-slate-800 font-medium">{ind.label}</td>
                                 <td className="p-3 text-center font-black text-slate-900">{ind.avg.toFixed(3)}</td>
                                 <td className="p-3 text-center"><span className="font-black text-white px-3 py-1 rounded-full text-xs" style={{ background: col }}>{mutu}</span></td>
                                 <td className="p-3 text-center font-semibold" style={{ color: col }}>{kat}</td>
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
                  return (
                  <div className="flex-1 flex flex-col p-12 bg-white">
                     <h2 className="text-3xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">{slide.title}</h2>
                     <div className="grid grid-cols-2 gap-10 flex-1">
                        <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center">
                           <p className="text-xl font-bold text-slate-500 uppercase tracking-widest mb-4">Nilai Rata-Rata Unsur</p>
                           <p className="text-[7rem] font-black text-slate-900 leading-none mb-6">{avg.toFixed(2)}</p>
                           <p className="text-2xl font-bold text-slate-600">Skala 1 - 4</p>
                        </div>
                        <div className="flex flex-col bg-white border border-slate-200 rounded-3xl p-10">
                           <p className="text-xl font-bold text-slate-500 uppercase tracking-widest mb-8 text-center">Distribusi Jawaban Responden</p>
                           <div className="flex-1">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                  { name: 'Buruk', value: Number(dist['1'] ?? 0) },
                                  { name: 'Cukup', value: Number(dist['2'] ?? 0) },
                                  { name: 'Baik',  value: Number(dist['3'] ?? 0) },
                                  { name: 'Sangat Baik', value: Number(dist['4'] ?? 0) }
                                ]} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                   <XAxis dataKey="name" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} />
                                   <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                   <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                   <Bar dataKey="value" fill="#4285F4" radius={[6, 6, 0, 0]} maxBarSize={80}>
                                     {[0, 1, 2, 3].map((_, idx) => (
                                       <Cell key={`c-${idx}`} fill={idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : '#10b981'} />
                                     ))}
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
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-900 text-white">
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

                {/* Footer on each slide (except cover/closing) */}
                {slide.type !== "cover" && slide.type !== "closing" && slide.type !== "chapter" && (
                  <div className="absolute bottom-6 left-12 right-12 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-4 print:bottom-4 print:text-black">
                     <span>{presentationData.subtitle.split('\n')[0]}</span>
                     <span>Hal. {index}</span>
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
