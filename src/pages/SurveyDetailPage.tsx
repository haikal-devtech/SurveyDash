import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SurveyConfig, SurveyData } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from "recharts";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  ArrowLeft, RefreshCw, Users, TrendingUp, Info, Shield, Share2, Copy, Check,
  LayoutDashboard as LucideBarChart, MessageSquare, BriefcaseBusiness, GraduationCap, PieChart as PieChartIcon, 
  Download, Bell, Timer, Play, Pause
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

// Helper for CSV Export
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header], (key, value) => value === null ? "" : value)).join(","));
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export const SurveyDetailPage: React.FC = () => {
  const { id } = useParams();
  const [config, setConfig] = useState<SurveyConfig | null>(null);
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute
  const [lastNotification, setLastNotification] = useState<{message: string, type: 'info' | 'success'} | null>(null);
  const { role, user } = useAuth();
  const [respPage, setRespPage] = useState(1);
  const [respSort, setRespSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'timestamp', dir: 'desc' });
  const RESP_PER_PAGE = 50;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled && config) {
      interval = setInterval(() => {
        fetchData(config.scriptUrl);
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled, refreshInterval, config]);


  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVisibility = async (newVisibility: "PRIVATE" | "LINK_ONLY" | "PUBLIC") => {
    if (!id || !config || id === "demo") return;
    try {
      await updateDoc(doc(db, "surveys", id), { 
        visibility: newVisibility,
        isPublic: newVisibility === "PUBLIC" // Backwards compat
      });
      setConfig({ ...config, visibility: newVisibility, isPublic: newVisibility === "PUBLIC" });
    } catch (err) {
      console.error("Error updating visibility:", err);
    }
  };

  const fetchData = async (url: string) => {
    if (!url || url === "undefined" || url === "null" || url.trim() === "") {
      setError("URL Script tidak valid atau belum dikonfigurasi. Silakan periksa pengaturan survei di Management Console.");
      return;
    }

    try {
      const resp = await axios.get(`/api/survey-data?scriptUrl=${encodeURIComponent(url)}`);
      
      // Check for updates for Super Admin
      if (role === 'SUPER_ADMIN' && data && JSON.stringify(data) !== JSON.stringify(resp.data)) {
        setLastNotification({ message: "Data survei telah diperbarui otomatis.", type: "info" });
        setTimeout(() => setLastNotification(null), 5000);
      }

      setData(resp.data);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      const serverError = typeof err.response?.data === 'object' 
        ? (err.response.data.error || JSON.stringify(err.response.data)) 
        : (err.response?.data || err.message);
      setError(`Gagal memuat data: ${serverError}. Pastikan URL Google Apps Script benar dan sudah dideploy sebagai Web App.`);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      if (!id) return;
      
      // Handle Demo Mode
      if (id === "demo") {
        const demoConfig: SurveyConfig = {
          id: "demo",
          name: "DEMO: Survei Kepuasan Masyarakat",
          agency: "BPBD Kota Tangerang Selatan",
          period: "April 2026",
          scriptUrl: "demo",
          isActive: true,
          createdAt: new Date(),
          createdBy: "system",
          visibility: "PUBLIC"
        };
        setConfig(demoConfig);
        await fetchData("demo");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "surveys", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cfg = { id: snap.id, ...snap.data() } as SurveyConfig;
          setConfig(cfg);
          await fetchData(cfg.scriptUrl);
        }
      } catch (err) {
        console.error("Config fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [id]);

  useEffect(() => {
    if (config?.name) {
      document.title = `SurveyDash - ${config.name}`;
    }
    return () => {
      document.title = "SurveyDash";
    };
  }, [config]);

  const handleRefresh = async () => {
    if (!config) return;
    setRefreshing(true);
    await fetchData(config.scriptUrl);
    setRefreshing(false);
  };

  if (loading) return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-32 md:h-40 bg-muted/40 rounded-[2rem] border border-white/10" />
      
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 md:h-36 bg-muted/30 rounded-[1.5rem] border border-white/5" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="space-y-4 pt-6">
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-muted/40 rounded-full" />
          <div className="h-10 w-32 bg-muted/20 rounded-full" />
          <div className="h-10 w-32 bg-muted/20 rounded-full hidden md:block" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-muted/20 rounded-3xl" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted/20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto text-center flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="relative">
        <div className="absolute -inset-4 bg-destructive/10 blur-xl rounded-full" />
        <Info className="w-20 h-20 text-destructive relative z-10 mx-auto" />
      </div>
      <div className="space-y-2">
        <h3 className="text-3xl font-black tracking-tighter text-foreground uppercase">Duh, koneksi terputus!</h3>
        <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Sistem <strong className="text-primary font-black">SurveyDash</strong> gagal mengambil data dari Google Sheets. <br className="hidden md:block" />
          <span className="italic opacity-80">{error}</span>
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
        <Button onClick={() => window.location.reload()} className="h-12 px-8 rounded-full font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95">
          <RefreshCw className="w-4 h-4 mr-2" /> Coba Sinkronisasi Ulang
        </Button>
        <Link to="/dashboard">
          <Button variant="ghost" className="h-12 px-6 rounded-full font-bold text-muted-foreground">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );

  if (!data || !config) return null;

  const demoGenderData = data?.demographics?.gender 
    ? Object.entries(data.demographics.gender).map(([name, value]) => ({ name, value }))
    : [];
    
  const demoEduData = data?.demographics?.pendidikan || data?.demographics?.education 
    ? Object.entries(data?.demographics?.pendidikan || data?.demographics?.education).map(([name, value]) => ({ name, value }))
    : [];

  const demoUmurData = data?.demographics?.umur
    ? Object.entries(data.demographics.umur).map(([name, value]) => ({ name, value }))
    : [];
    
  const demoPekerjaanData = data?.demographics?.pekerjaan
    ? Object.entries(data.demographics.pekerjaan).map(([name, value]) => ({ name, value }))
    : [];

  const demoSukuData = data?.demographics?.suku
    ? Object.entries(data.demographics.suku).map(([name, value]) => ({ name, value }))
    : [];

  const demoLayananData = data?.demographics?.layanan
    ? Object.entries(data.demographics.layanan).map(([name, value]) => ({ name, value }))
    : [];

  // Color palettes — bright, works on both light & dark
  const COLORS_GENDER = ['#3b82f6', '#ec4899', '#8b5cf6', '#f97316']; // Blue/Pink
  const COLORS_UMUR = ['#10b981', '#34d399', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6']; // Multi
  const COLORS_PEKERJAAN = ['#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#6366f1', '#f43f5e'];
  const COLORS_SUKU = ['#e11d48', '#f97316', '#eab308', '#10b981', '#06b6d4', '#8b5cf6']; // Vivid
  const COLORS_LAYANAN = ['#0ea5e9', '#06b6d4', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#ef4444', '#eab308', '#22c55e', '#3b82f6'];

  // Custom tooltip for recharts — readable in dark mode
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-2 text-sm">
          {label && <p className="font-bold text-foreground mb-1">{label}</p>}
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-foreground font-semibold">
              <span style={{ color: p.color || p.fill }}>●</span> {p.name || 'Jumlah'}: <strong>{p.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass rounded-[2rem] overflow-hidden relative group p-8 border-white/20 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <LucideBarChart className="w-48 h-48 animate-float text-primary/30" />
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <Link to="/dashboard">
            <Button variant="outline" size="icon" className="rounded-2xl h-14 w-14 glass border-white/20 hover:scale-110 transition-all">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 uppercase text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full">
                 {data.meta.period}
               </Badge>
               <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-muted/30 px-3 py-1 rounded-full backdrop-blur-sm border border-border/50">
                 <RefreshCw className="w-3 h-3 animate-spin-slow" />
                 Sinkronisasi: {new Date(data.meta.last_updated).toLocaleString("id-ID")}
               </div>
             </div>
               <h2 className="text-4xl font-black tracking-tighter text-gradient uppercase leading-none mt-1">{data.meta.survey_name}</h2>
               <div className="flex items-center gap-2 text-sm text-muted-foreground/80 font-semibold tracking-tight">
               <div className="p-1 rounded-md bg-primary/10">
                 <BriefcaseBusiness className="w-4 h-4 text-primary" />
               </div>
               {config.agency}
             </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          {role === "SUPER_ADMIN" && (
            <Dialog>
              <DialogTrigger render={
                <Button variant="outline" className="gap-2 font-bold text-xs h-12 px-4 rounded-2xl border-primary/20 hover:bg-primary/5 transition-all">
                  <Share2 className="w-4 h-4" />
                  Bagikan
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bagikan Hasil Survei</DialogTitle>
                  <DialogDescription>Aktifkan akses publik atau salin link untuk dikirimkan.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Mode Visibilitas</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "PRIVATE", label: "Privat", desc: "Hanya Admin" },
                        { id: "LINK_ONLY", label: "Link Sahaja", desc: "Tidak di Beranda" },
                        { id: "PUBLIC", label: "Publik Tengah", desc: "Muncul di Beranda" }
                      ].map((v) => (
                        <Button
                          key={v.id}
                          variant={config?.visibility === v.id ? "default" : "outline"}
                          className="flex flex-col h-auto py-3 px-2 gap-1 rounded-xl"
                          onClick={() => toggleVisibility(v.id as any)}
                        >
                          <span className="text-[10px] font-black">{v.label}</span>
                          <span className="text-[8px] opacity-70 font-medium leading-tight">{v.desc}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Link Dashboard</p>
                    <div className="flex gap-2">
                      <Input value={window.location.href} readOnly className="h-10 text-xs font-mono bg-muted/30" />
                      <Button onClick={handleCopyLink} size="icon" className="h-10 w-10 shrink-0">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                      * Jika akses publik nonaktif, hanya admin dan orang yang diberikan akses khusus yang bisa melihat dashboard ini.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="gap-2 font-bold text-xs h-12 px-6 rounded-2xl border-primary/20 hover:border-primary transition-all hidden sm:flex"
          >
            <PieChartIcon className="w-4 h-4" />
            Cetak PDF
          </Button>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="gap-2 font-black text-xs h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "SINKRONISASI..." : "REFRESH DATA"}
          </Button>

          <Button 
            variant={autoRefreshEnabled ? "default" : "outline"}
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`gap-2 font-black text-xs h-12 px-4 rounded-2xl transition-all border-primary/20 ${autoRefreshEnabled ? 'bg-emerald-500 hover:bg-emerald-600 border-none' : ''}`}
          >
            {autoRefreshEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden lg:inline">{autoRefreshEnabled ? "AUTO-FETCH AKTIF (1m)" : "AUTO-FETCH"}</span>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {lastNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 bg-card border-2 border-primary/20 min-w-[300px]"
          >
            <div className={`p-2 rounded-full ${lastNotification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
              <Bell className="w-4 h-4" />
            </div>
            <p className="text-sm font-bold text-foreground">{lastNotification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Margin of Error", value: "±2.5%", icon: Info, color: "text-blue-500" },
          { label: "Tingkat Partisipasi", value: "94%", icon: Users, color: "text-purple-500" },
          { label: "Index Reliability", value: "0.89", icon: Shield, color: "text-emerald-500" },
          { label: "Trend Kepuasan", value: "+4.2%", icon: TrendingUp, color: "text-orange-500" }
        ].map((stat, i) => (
          <Card key={i} className="border-none bg-card/50 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-muted ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                <p className="text-sm font-black">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-primary text-primary-foreground border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <Users className="w-32 h-32" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 uppercase text-[10px] font-black tracking-widest">Total Responden</CardDescription>
            <CardTitle className="text-5xl font-black tracking-tighter">{data.meta.total_respondents}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
               <Users className="w-4 h-4" />
               Sampel Validitas 95%
             </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full" style={{
            backgroundColor: data.ikm.score >= 88.31 ? '#10b981' : data.ikm.score >= 76.61 ? '#3b82f6' : data.ikm.score >= 65.00 ? '#f59e0b' : '#ef4444'
          }} />
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Indeks Kepuasan (NIK)</CardDescription>
            <CardTitle className="text-5xl font-black tracking-tighter" style={{
              color: data.ikm.score >= 88.31 ? '#10b981' : data.ikm.score >= 76.61 ? '#3b82f6' : data.ikm.score >= 65.00 ? '#f59e0b' : '#ef4444'
            }}>{data.ikm.score.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
             <Badge className="hover:opacity-90 border-none font-black px-4 py-1.5 rounded-full uppercase tracking-wider text-xs text-white" style={{
               backgroundColor: data.ikm.score >= 88.31 ? '#10b981' : data.ikm.score >= 76.61 ? '#3b82f6' : data.ikm.score >= 65.00 ? '#f59e0b' : '#ef4444'
             }}>
               {(() => {
                 const s = data.ikm.score;
                 if (s >= 88.31) return "Mutu A — Sangat Baik";
                 if (s >= 76.61) return "Mutu B — Baik";
                 if (s >= 65.00) return "Mutu C — Kurang Baik";
                 return "Mutu D — Tidak Baik";
               })()}
             </Badge>
             <p className="text-[10px] text-muted-foreground mt-2 font-mono">
               Nilai Interval: {data.ikm.score >= 88.31 ? "88,31–100" : data.ikm.score >= 76.61 ? "76,61–88,30" : data.ikm.score >= 65.00 ? "65,00–76,60" : "25,00–64,99"}
             </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/50" />
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Target Mutu 2026</CardDescription>
            <CardTitle className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">90.00</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 text-xs text-muted-foreground font-black uppercase tracking-wider bg-emerald-500/10 w-fit px-3 py-1 rounded-full border border-emerald-500/20">
               <TrendingUp className="w-4 h-4 text-emerald-500" />
               Gap: {(90 - data.ikm.score).toFixed(2)} poin
             </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <BriefcaseBusiness className="w-32 h-32 text-primary" />
          </div>
          <div className="absolute top-0 left-0 w-2 h-full bg-primary/50" />
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Instansi Pelaksana</CardDescription>
            <CardTitle className="text-base font-black mt-2 uppercase leading-tight text-foreground">{config.agency}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] italic">Official E-Survey Dashboard</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="indicators" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="indicators" className="gap-2">
            <LucideBarChart className="w-4 h-4" />
            9 Indikator IKM
          </TabsTrigger>
          <TabsTrigger value="demographics" className="gap-2">
            <PieChartIcon className="w-4 h-4" />
            Demografi
          </TabsTrigger>
          <TabsTrigger value="public" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Harapan Publik
          </TabsTrigger>
          <TabsTrigger value="respondents" className="gap-2">
            <Users className="w-4 h-4" />
            Daftar Responden
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="space-y-4">
          {data.indicators && data.indicators.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-1 border-none shadow-sm bg-muted/20">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-lg">Sebaran Nilai Indikator</CardTitle>
                   <CardDescription>Rata-rata tiap unsur pelayanan (Skala 1.0 - 4.0)</CardDescription>
                 </div>
                 <Button variant="outline" size="sm" onClick={() => exportToCSV(data.indicators, `ikm_indicators_${config?.id}`)} className="h-8 gap-2 text-[10px] font-black uppercase">
                   <Download className="w-3 h-3" />
                   Ekspor CSV
                 </Button>
               </CardHeader>
               <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.indicators} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.15} />
                      <XAxis type="number" domain={[0, 4]} hide />
                      <YAxis dataKey="label" type="category" width={100} axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'currentColor' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.1)' }} />
                      <Bar 
                        dataKey="avg" 
                        radius={[0, 4, 4, 0]} 
                        barSize={24}
                      >
                         {data.indicators.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.avg >= 3.532 ? '#10b981' : entry.avg >= 3.0644 ? '#3b82f6' : entry.avg >= 2.60 ? '#f59e0b' : '#ef4444'} />
                         ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </CardContent>
            </Card>

            <div className="space-y-4 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
              {data.indicators.map((indicator, idx) => {
                const total = indicator.distribution.reduce((a, b) => a + b, 0);
                const maxVal = Math.max(...indicator.distribution);
                const maxIdx = indicator.distribution.indexOf(maxVal);
                const DIST_COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981'];
                
                return (
                  <motion.div
                    key={indicator.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <CardTitle className="text-sm font-bold uppercase tracking-tight">{indicator.label}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="font-mono text-lg">{indicator.avg.toFixed(2)}</Badge>
                      </CardHeader>
                      <CardContent className="pb-6 pt-0">
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                             {["SK", "K", "B", "SB"].map((label, i) => {
                               const count = indicator.distribution[i];
                               const percentage = ((count / total) * 100).toFixed(1);
                               const isDominant = i === maxIdx;
                               const barColor = DIST_COLORS[i];
                               
                               return (
                                <div 
                                  key={label} 
                                  className="p-2 rounded-xl border transition-all duration-300"
                                  style={{ 
                                    backgroundColor: `${barColor}18`,
                                    borderColor: isDominant ? barColor : 'rgba(128,128,128,0.2)',
                                    boxShadow: isDominant ? `0 0 0 1px ${barColor}` : undefined
                                  }}
                                >
                                  <div className="flex items-center justify-between text-[9px] font-black uppercase mb-1.5 tracking-tighter" style={{ color: barColor }}>
                                    <span>{label}</span>
                                    <span className="text-[11px] font-black text-foreground">{count} <span className="text-[8px] font-bold opacity-60">org</span></span>
                                  </div>
                                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${barColor}25` }}>
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: barColor }} />
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[10px] font-black" style={{ color: barColor }}>{percentage}%</span>
                                    {isDominant && (
                                      <Badge className="h-3.5 px-1 text-[7px] font-black rounded-sm border-none text-white" style={{ backgroundColor: barColor }}>DOMINAN</Badge>
                                    )}
                                  </div>
                                </div>
                               );
                             })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
            <div className="py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
              <p className="text-muted-foreground italic">Data indikator belum tersedia di Google Sheets.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* GENDER */}
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Users className="w-4 h-4 text-slate-700" />
                   Jenis Kelamin
                 </CardTitle>
                 <Button variant="ghost" size="icon" onClick={() => exportToCSV(demoGenderData, `gender_data_${config?.id}`)} className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
               </CardHeader>
               <CardContent className="h-[250px] min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demoGenderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {demoGenderData.map((entry, index) => {
                          const name = entry.name.toLowerCase();
                          let color = COLORS_GENDER[index % COLORS_GENDER.length];
                          if (name.includes('laki') || name.includes('pria')) color = '#3b82f6'; // Blue
                          else if (name.includes('perempuan') || name.includes('wanita')) color = '#ec4899'; // Pink
                          
                          return <Cell key={`cell-${index}`} fill={color} stroke="transparent" />;
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: 'currentColor' }} />
                    </PieChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* UMUR */}
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Timer className="w-4 h-4 text-emerald-600" />
                   Kelompok Umur
                 </CardTitle>
                 <Button variant="ghost" size="icon" onClick={() => exportToCSV(demoUmurData, `umur_data_${config?.id}`)} className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
               </CardHeader>
               <CardContent className="h-[250px] min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demoUmurData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(128,128,128,0.1)'}} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {demoUmurData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_UMUR[index % COLORS_UMUR.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* PENDIDIKAN */}
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <GraduationCap className="w-4 h-4 text-indigo-600" />
                   Pendidikan Terakhir
                 </CardTitle>
                 <Button variant="ghost" size="icon" onClick={() => exportToCSV(demoEduData, `education_data_${config?.id}`)} className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
               </CardHeader>
               <CardContent className="h-[250px] min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demoEduData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={9} axisLine={false} tickLine={false} width={85} tick={{ fill: 'currentColor' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(128,128,128,0.1)'}} />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* PEKERJAAN */}
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <BriefcaseBusiness className="w-4 h-4 text-amber-500" />
                   Profesi / Pekerjaan
                 </CardTitle>
                 <Button variant="ghost" size="icon" onClick={() => exportToCSV(demoPekerjaanData, `pekerjaan_data_${config?.id}`)} className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
               </CardHeader>
               <CardContent className="h-[250px] min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demoPekerjaanData}
                        cx="50%"
                        cy="40%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {demoPekerjaanData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_PEKERJAAN[index % COLORS_PEKERJAAN.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '9px', color: 'currentColor' }} iconSize={8} />
                    </PieChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* SUKU ETNIS */}
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Users className="w-4 h-4 text-rose-500" />
                   Suku Etnis
                 </CardTitle>
                 <Button variant="ghost" size="icon" onClick={() => exportToCSV(demoSukuData, `suku_data_${config?.id}`)} className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
               </CardHeader>
               <CardContent className="h-[250px] min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demoSukuData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(128,128,128,0.1)'}} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                        {demoSukuData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_SUKU[index % COLORS_SUKU.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* JENIS LAYANAN */}
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Info className="w-4 h-4 text-sky-500" />
                   Jenis Layanan
                 </CardTitle>
                 <Button variant="ghost" size="icon" onClick={() => exportToCSV(demoLayananData, `layanan_data_${config?.id}`)} className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
               </CardHeader>
               <CardContent className="h-[250px] min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demoLayananData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={8} axisLine={false} tickLine={false} width={110} tick={{ fill: 'currentColor' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(128,128,128,0.1)'}} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                        {demoLayananData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_LAYANAN[index % COLORS_LAYANAN.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="public" className="space-y-6">
           {data.open_ended ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                      Harapan Responden
                    </CardTitle>
                    <CardDescription>Masukan dan saran untuk peningkatan layanan</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(data.open_ended.expectations.map(e => ({ expectation: e })), `expectations_${config?.id}`)} className="h-8 gap-2 text-[10px] font-black uppercase">
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {data.open_ended.expectations.map((text, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 bg-muted/40 dark:bg-slate-900/40 rounded-xl border border-border/50 italic text-sm text-foreground/90 leading-relaxed"
                        >
                          "{text}"
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      Opini Umum
                    </CardTitle>
                    <CardDescription>Pandangan umum terhadap kinerja instansi</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(data.open_ended.general_opinion.map(o => ({ opinion: o })), `general_opinion_${config?.id}`)} className="h-8 gap-2 text-[10px] font-black uppercase">
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {data.open_ended.general_opinion.map((text, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 text-sm text-foreground/90 leading-relaxed"
                        >
                          "{text}"
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
           ) : (
             <div className="py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
               <p className="text-muted-foreground italic">Data saran dan aspirasi publik belum tersedia.</p>
             </div>
           )}
        </TabsContent>

        <TabsContent value="respondents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Nama-nama Responden</CardTitle>
                <CardDescription>Klik "Detail Jawaban" untuk melihat rincian setiap kuesioner.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Sort controls */}
                <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  <span className="uppercase tracking-wider text-[10px]">Urutkan:</span>
                  {[
                    { key: 'name', label: 'Nama' },
                    { key: 'gender', label: 'Gender' },
                    { key: 'education', label: 'Pendidikan' },
                    { key: 'timestamp', label: 'Waktu' },
                  ].map(s => (
                    <Button
                      key={s.key}
                      variant={respSort.key === s.key ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-[10px] font-black px-2"
                      onClick={() => {
                        if (respSort.key === s.key) {
                          setRespSort({ key: s.key, dir: respSort.dir === 'asc' ? 'desc' : 'asc' });
                        } else {
                          setRespSort({ key: s.key, dir: 'asc' });
                        }
                        setRespPage(1);
                      }}
                    >
                      {s.label} {respSort.key === s.key ? (respSort.dir === 'asc' ? '↑' : '↓') : ''}
                    </Button>
                  ))}
                </div>
                <Badge variant="outline" className="h-7">{data.respondents?.length || 0} Total</Badge>
                <Button variant="outline" size="sm" onClick={() => {
                  const exportData = data.respondents.map(r => ({
                    ...r,
                    answers: JSON.stringify(r.answers)
                  }));
                  exportToCSV(exportData, `respondents_list_${config?.id}`);
                }} className="h-7 gap-2 text-[10px] font-black uppercase">
                  <Download className="w-3 h-3" />
                  Excel/CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.respondents && data.respondents.length > 0 ? (() => {
                // Sort
                const sorted = [...data.respondents].sort((a, b) => {
                  const k = respSort.key as keyof typeof a;
                  const av = String(a[k] ?? '');
                  const bv = String(b[k] ?? '');
                  return respSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                });
                // Paginate
                const totalPages = Math.ceil(sorted.length / RESP_PER_PAGE);
                const pageData = sorted.slice((respPage - 1) * RESP_PER_PAGE, respPage * RESP_PER_PAGE);

                return (
                  <div className="space-y-4">
                    <div className="border rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="hidden md:table-cell">Surveyor</TableHead>
                            <TableHead className="hidden lg:table-cell">Gender</TableHead>
                            <TableHead className="hidden lg:table-cell">Pendidikan</TableHead>
                            <TableHead>Waktu</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageData.map((r, idx) => (
                            <TableRow key={r.id} className="hover:bg-muted/30">
                              <TableCell className="text-muted-foreground text-xs">{(respPage - 1) * RESP_PER_PAGE + idx + 1}</TableCell>
                              <TableCell className="font-bold text-foreground">{r.name}</TableCell>
                              <TableCell className="hidden md:table-cell font-medium text-foreground/80">{r.surveyor || "-"}</TableCell>
                              <TableCell className="hidden lg:table-cell text-foreground/80">{r.gender}</TableCell>
                              <TableCell className="hidden lg:table-cell text-foreground/80">{r.education}</TableCell>
                              <TableCell className="text-muted-foreground text-xs font-medium">
                                {new Date(r.timestamp).toLocaleDateString("id-ID")}
                              </TableCell>
                              <TableCell className="text-right">
                                 <Dialog>
                                   <DialogTrigger render={
                                     <Button variant="outline" size="sm" className="h-7 text-xs font-bold">Detail Jawaban</Button>
                                   } />
                                   <DialogContent className="max-w-[380px] p-4">
                                     <DialogHeader className="space-y-1">
                                       <DialogTitle className="text-sm font-bold">Detail: {r.name}</DialogTitle>
                                       <DialogDescription className="text-[10px]">Transkrip lengkap jawaban survey.</DialogDescription>
                                     </DialogHeader>
                                     <div className="space-y-3 pt-2">
                                       <div className="grid grid-cols-2 gap-y-1 text-[10px] p-2 bg-primary/5 dark:bg-primary/20 rounded-lg border border-primary/10">
                                          <div className="text-muted-foreground">Jenis Kelamin</div>
                                          <div className="font-bold text-right text-foreground">{r.gender}</div>
                                          <div className="text-muted-foreground">Pendidikan Terakhir</div>
                                          <div className="font-bold text-right text-foreground">{r.education}</div>
                                          <div className="text-muted-foreground">Surveyor</div>
                                          <div className="font-bold text-right text-primary">{r.surveyor || "-"}</div>
                                          <div className="text-muted-foreground">Rata-rata Skor</div>
                                          <div className="font-black text-right text-primary">
                                            {(() => {
                                              const scores = Object.values(r.answers).filter(v => typeof v === 'number') as number[];
                                              return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "0.00";
                                            })()}
                                          </div>
                                          <div className="text-muted-foreground">Waktu Pengisian</div>
                                          <div className="font-bold text-right text-[9px] text-foreground">{new Date(r.timestamp).toLocaleString("id-ID")}</div>
                                       </div>
                                       <div className="space-y-1">
                                          <h4 className="text-[9px] font-black uppercase text-primary tracking-widest px-1">Dokumentasi</h4>
                                          {r.documentation && r.documentation.startsWith("http") ? (
                                            <a href={r.documentation} target="_blank" rel="noreferrer" className="block w-full hover:opacity-80 transition-opacity">
                                              <img src={r.documentation} alt="Dokumentasi" className="w-full h-auto max-h-24 object-cover rounded-md border shadow-sm" />
                                            </a>
                                          ) : (
                                            <div className="p-2 bg-muted/50 rounded-md text-center text-[9px] text-muted-foreground border border-dashed">Tidak ada foto</div>
                                          )}
                                       </div>
                                       <div className="space-y-1">
                                          <h4 className="text-[9px] font-black uppercase text-primary tracking-widest px-1">Indikator Kepuasan</h4>
                                          <div className="space-y-0.5">
                                            {Object.entries(r.answers).map(([key, val]) => (
                                              <div key={key} className="flex justify-between items-center px-2 py-1 hover:bg-muted/50 rounded-md transition-colors">
                                                <span className="text-[9px] font-medium text-foreground leading-tight">{key}</span>
                                                <Badge className="font-black h-4 w-4 text-[8px] flex shrink-0 items-center justify-center p-0 rounded-full">{val}</Badge>
                                              </div>
                                            ))}
                                          </div>
                                       </div>
                                     </div>
                                   </DialogContent>
                                 </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          Halaman {respPage} dari {totalPages} &nbsp;·&nbsp; {sorted.length} responden
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline" size="sm" className="h-8 text-xs"
                            disabled={respPage === 1}
                            onClick={() => setRespPage(p => p - 1)}
                          >← Sebelumnya</Button>
                          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            const page = totalPages <= 7 ? i + 1 : respPage <= 4 ? i + 1 : respPage >= totalPages - 3 ? totalPages - 6 + i : respPage - 3 + i;
                            return (
                              <Button
                                key={page}
                                variant={respPage === page ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 w-8 text-xs p-0"
                                onClick={() => setRespPage(page)}
                              >{page}</Button>
                            );
                          })}
                          <Button
                            variant="outline" size="sm" className="h-8 text-xs"
                            disabled={respPage === totalPages}
                            onClick={() => setRespPage(p => p + 1)}
                          >Berikutnya →</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                     <Users className="w-8 h-8 text-muted-foreground" />
                   </div>
                   <p className="text-muted-foreground italic text-sm">Data responden individual belum tersedia untuk survei ini.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};


