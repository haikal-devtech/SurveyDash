import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SurveyConfig, SurveyData } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Download, Edit3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Import Recharts for rendering charts in the presentation
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
  
  // Editable Content State
  const [presentationData, setPresentationData] = useState({
    title: "LAPORAN HASIL SURVEI KEPUASAN MASYARAKAT",
    subtitle: "",
    conclusions: "1. Kualitas layanan secara umum dinilai baik oleh masyarakat.\n2. Waktu tunggu pelayanan perlu ditingkatkan.\n3. Sarana dan prasarana sudah memadai namun perlu perawatan rutin.",
    recommendations: "1. Mengadakan pelatihan rutin untuk petugas layanan.\n2. Memperbaiki sistem antrean agar lebih efisien.\n3. Melakukan survei lanjutan secara berkala."
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
            subtitle: `${cfg.agency} - ${cfg.period}`
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

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1));
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]); // Need to add currentSlide to deps to get updated totalSlides if it was dynamic, but totalSlides is constant here (6)

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return <div className="p-10 text-center text-xl font-bold">Akses Ditolak. Hanya untuk Admin.</div>;
  }

  if (loading || !data || !config) {
    return <div className="p-10 text-center">Memuat Presentasi...</div>;
  }

  const totalSlides = 6;

  // Render Helpers for Charts inside Slides
  const renderPieChart = (chartData: any[], cx="50%") => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} cx={cx} cy="50%" outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_GOOGLE[index % COLORS_GOOGLE.length]} />)}
        </Pie>
        <Tooltip />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );

  const demoGenderData = data?.demographics?.gender ? Object.entries(data.demographics.gender).map(([name, value]) => ({ name, value })) : [];
  const demoEduData = data?.demographics?.pendidikan || data?.demographics?.education ? Object.entries(data?.demographics?.pendidikan || data?.demographics?.education).map(([name, value]) => ({ name, value })) : [];
  const demoUmurData = data?.demographics?.umur ? Object.entries(data.demographics.umur).map(([name, value]) => ({ name, value })) : [];
  const demoPekerjaanData = data?.demographics?.pekerjaan ? Object.entries(data.demographics.pekerjaan).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col print:bg-white print:block">
      
      {/* Presentation Top Bar (Hidden in Print Mode) */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-white/10 print:hidden text-white">
        <div className="flex items-center gap-4">
          <Link to={`/survey/${id}`}>
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg hidden md:block">Mode Presentasi</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={isEditing ? "default" : "outline"} 
            className={`gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white ${isEditing ? 'bg-primary text-white border-none hover:bg-primary/90' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <><Save className="w-4 h-4"/> Selesai Edit</> : <><Edit3 className="w-4 h-4"/> Edit Teks</>}
          </Button>
          <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white" onClick={handlePrint}>
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button variant="outline" className="gap-2 text-xs font-bold border-white/20 hover:bg-white/10 text-white" onClick={toggleFullscreen}>
            <Maximize className="w-4 h-4" /> {isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </div>

      {/* Main Presentation Area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 print:p-0 overflow-hidden">
        
        {/* Presentation Container (16:9 Aspect Ratio) */}
        <div 
          ref={presentationRef}
          className={`relative bg-white text-slate-900 shadow-2xl overflow-hidden print:shadow-none print:w-[297mm] print:h-[210mm] print:border-none
            ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none' : 'w-full max-w-5xl aspect-video rounded-xl border border-border'}
          `}
          style={{
            pageBreakAfter: 'always'
          }}
        >
          {/* SLIDE 1: COVER */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-opacity duration-500 bg-gradient-to-br from-slate-50 to-slate-200 ${currentSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}>
             <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-8">
               <img src="/vite.svg" alt="Logo" className="w-12 h-12" /> {/* Fallback logo */}
             </div>
             {isEditing ? (
                <div className="w-full max-w-3xl space-y-4">
                  <Input value={presentationData.title} onChange={e => setPresentationData({...presentationData, title: e.target.value})} className="text-4xl font-black text-center h-16" />
                  <Input value={presentationData.subtitle} onChange={e => setPresentationData({...presentationData, subtitle: e.target.value})} className="text-xl text-center" />
                </div>
             ) : (
                <>
                  <h1 className="text-5xl md:text-6xl font-black text-slate-900 uppercase tracking-tight mb-4">{presentationData.title}</h1>
                  <p className="text-2xl font-medium text-slate-600">{presentationData.subtitle}</p>
                </>
             )}
             <div className="mt-16 text-sm font-bold text-slate-400 uppercase tracking-widest">
               Generated by SurveyDash E-Survey Platform
             </div>
          </div>

          {/* SLIDE 2: RINGKASAN EKSEKUTIF */}
          <div className={`absolute inset-0 flex flex-col p-12 transition-opacity duration-500 bg-white ${currentSlide === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}>
             <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-12">Ringkasan Eksekutif</h2>
             <div className="grid grid-cols-2 gap-10 flex-1 items-center">
                <div className="space-y-8">
                   <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Total Responden</p>
                      <p className="text-6xl font-black text-slate-900">{data.meta.total_respondents} <span className="text-2xl text-slate-400">orang</span></p>
                   </div>
                   <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Periode Pelaksanaan</p>
                      <p className="text-3xl font-black text-slate-900">{config.period}</p>
                   </div>
                </div>
                <div className="flex flex-col items-center justify-center p-12 bg-primary/5 rounded-3xl border-2 border-primary/20 h-full">
                   <p className="text-lg font-black text-primary uppercase tracking-widest mb-4">Indeks Kepuasan Masyarakat (IKM)</p>
                   <p className="text-[8rem] font-black leading-none text-slate-900 mb-4">{data.ikm.score.toFixed(2)}</p>
                   <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-2xl font-black uppercase tracking-wider">
                     Mutu: {data.ikm.category}
                   </div>
                </div>
             </div>
          </div>

          {/* SLIDE 3: DEMOGRAFI RESPONDEN */}
          <div className={`absolute inset-0 flex flex-col p-12 transition-opacity duration-500 bg-white ${currentSlide === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}>
             <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">Demografi Responden</h2>
             <div className="grid grid-cols-2 grid-rows-2 gap-6 flex-1">
                <div className="border border-slate-200 rounded-xl p-4 flex flex-col">
                   <h3 className="text-center font-bold text-sm uppercase text-slate-500 mb-2">Jenis Kelamin</h3>
                   <div className="flex-1">{renderPieChart(demoGenderData, "40%")}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 flex flex-col">
                   <h3 className="text-center font-bold text-sm uppercase text-slate-500 mb-2">Pendidikan Terakhir</h3>
                   <div className="flex-1">{renderPieChart(demoEduData, "40%")}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 flex flex-col">
                   <h3 className="text-center font-bold text-sm uppercase text-slate-500 mb-2">Kelompok Umur</h3>
                   <div className="flex-1">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demoUmurData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                           <YAxis fontSize={10} tickLine={false} axisLine={false} />
                           <Bar dataKey="value" fill={COLORS_GOOGLE[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 flex flex-col">
                   <h3 className="text-center font-bold text-sm uppercase text-slate-500 mb-2">Profesi / Pekerjaan</h3>
                   <div className="flex-1">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demoPekerjaanData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" fontSize={10} width={80} tickLine={false} axisLine={false} />
                           <Bar dataKey="value" fill={COLORS_GOOGLE[1]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>

          {/* SLIDE 4: INDIKATOR IKM */}
          <div className={`absolute inset-0 flex flex-col p-12 transition-opacity duration-500 bg-white ${currentSlide === 3 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}>
             <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">Nilai 9 Indikator Kepuasan</h2>
             <div className="flex-1 border border-slate-200 rounded-2xl p-8 bg-slate-50">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data.indicators} layout="vertical" margin={{ left: 180, right: 20 }}>
                   <XAxis type="number" domain={[0, 4]} ticks={[1, 2, 3, 4]} stroke="#cbd5e1" />
                   <YAxis dataKey="label" type="category" width={180} axisLine={false} tickLine={false} fontSize={12} fontWeight="bold" fill="#0f172a" />
                   <Tooltip />
                   <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={32}>
                      {data.indicators.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.avg >= 3.532 ? '#10b981' : entry.avg >= 3.064 ? '#3b82f6' : entry.avg >= 2.60 ? '#f59e0b' : '#ef4444'} />
                      ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* SLIDE 5: KESIMPULAN & REKOMENDASI */}
          <div className={`absolute inset-0 flex flex-col p-12 transition-opacity duration-500 bg-white ${currentSlide === 4 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}>
             <h2 className="text-4xl font-black text-slate-900 uppercase border-l-8 border-primary pl-6 mb-8">Kesimpulan & Tindak Lanjut</h2>
             <div className="grid grid-cols-2 gap-10 flex-1">
                <div className="flex flex-col">
                  <div className="bg-blue-600 text-white p-4 rounded-t-xl font-black uppercase tracking-widest">Kesimpulan</div>
                  <div className="flex-1 border-2 border-blue-600 border-t-0 rounded-b-xl p-6 bg-blue-50/50">
                    {isEditing ? (
                      <Textarea value={presentationData.conclusions} onChange={e => setPresentationData({...presentationData, conclusions: e.target.value})} className="h-full resize-none bg-white text-base font-medium" />
                    ) : (
                      <div className="text-lg text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                        {presentationData.conclusions}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="bg-emerald-600 text-white p-4 rounded-t-xl font-black uppercase tracking-widest">Rekomendasi</div>
                  <div className="flex-1 border-2 border-emerald-600 border-t-0 rounded-b-xl p-6 bg-emerald-50/50">
                    {isEditing ? (
                      <Textarea value={presentationData.recommendations} onChange={e => setPresentationData({...presentationData, recommendations: e.target.value})} className="h-full resize-none bg-white text-base font-medium" />
                    ) : (
                      <div className="text-lg text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                        {presentationData.recommendations}
                      </div>
                    )}
                  </div>
                </div>
             </div>
          </div>

          {/* SLIDE 6: PENUTUP */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-opacity duration-500 bg-slate-900 text-white ${currentSlide === 5 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none print:opacity-100 print:relative print:z-10 print:pointer-events-auto print:w-[297mm] print:h-[210mm] print:page-break-after-always'}`}>
             <h1 className="text-6xl font-black uppercase tracking-tighter mb-6">Terima Kasih</h1>
             <p className="text-2xl font-medium text-slate-400 max-w-2xl mx-auto leading-relaxed">
               Laporan ini disusun secara otomatis oleh <strong className="text-white">SurveyDash</strong> berdasarkan data yang ditarik real-time dari responden.
             </p>
          </div>

          {/* Slide Navigation Indicators (Hidden in Print) */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 print:hidden z-50">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentSlide(i)}
                className={`w-3 h-3 rounded-full transition-all ${currentSlide === i ? 'bg-primary scale-125' : 'bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>

        </div>

        {/* Floating Navigation Controls (Hidden in Print) */}
        {!isEditing && (
          <div className="fixed bottom-10 right-10 flex gap-4 print:hidden z-50">
            <Button size="icon" className="w-14 h-14 rounded-full shadow-2xl bg-white text-slate-900 hover:bg-slate-100 hover:scale-105 transition-all" onClick={prevSlide} disabled={currentSlide === 0}>
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button size="icon" className="w-14 h-14 rounded-full shadow-2xl bg-white text-slate-900 hover:bg-slate-100 hover:scale-105 transition-all" onClick={nextSlide} disabled={currentSlide === totalSlides - 1}>
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>
        )}

      </div>
      
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
