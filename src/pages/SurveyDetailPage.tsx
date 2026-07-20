import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SurveyConfig, SurveyData, SlideVisibility, DEFAULT_SLIDE_VISIBILITY, Respondent } from "@/types";
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
  Download, Bell, Timer, Play, Pause, Camera, MapPin, MonitorPlay,
  FileText, Award, UserCheck, Shuffle, Flag, Building2, Heart, ShieldCheck, Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import html2canvas from "html2canvas";
import { getSurveyDashboardConfig, buildConfigFromSurvey, resolveSurveyDashboard } from "@/lib/survey-dashboard-config";
import { CandidateRankItem } from "@/types";

// Helper for PNG Export
const downloadPNG = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, { backgroundColor: '#020617' });
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

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


// ── Reusable slide helpers ────────────────────────────────────────────────────

const SlideEmptyState: React.FC<{ label: string; icon: React.FC<{ className?: string }> }> = ({ label, icon: Icon }) => (
  <div className="py-20 text-center flex flex-col items-center gap-4 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
      <Icon className="w-7 h-7 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <p className="font-black text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground italic">Data untuk bagian ini belum tersedia.</p>
    </div>
  </div>
);

const RankItems: React.FC<{ title?: string; items?: CandidateRankItem[] | any[] }> = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  const maxVal = Math.max(...items.map((i: any) => Number(i.percentage ?? i.count ?? 0)));
  return (
    <div className="space-y-2">
      {title && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>}
      <div className="space-y-2">
        {items.slice(0, 12).map((item: any, idx: number) => {
          const val = Number(item.percentage ?? item.count ?? 0);
          const pctStr = item.percentage != null
            ? (typeof item.percentage === "string" ? item.percentage : `${Number(item.percentage).toFixed(1)}%`)
            : (item.count != null ? `${item.count} orang` : "–");
          const w = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-[10px] font-black w-5 text-right text-muted-foreground shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold truncate text-foreground">{item.name ?? item.label ?? `Item ${idx + 1}`}</span>
                  <span className="text-xs font-black text-primary ml-2 shrink-0">{pctStr}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${w}%` }} />
                </div>
                {item.party && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{item.party}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Numbered text-quote list — for verbatim open-ended answers without meaningful frequency */
const TextQuoteList: React.FC<{ title: string; items: { name: string }[] }> = ({ title, items }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
    <div className="space-y-1.5">
      {items.slice(0, 10).map((item, idx) => (
        <div key={idx} className="flex gap-2.5 rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
          <span className="text-[10px] font-black text-muted-foreground/60 shrink-0 mt-0.5 w-4 text-right">{idx + 1}</span>
          <p className="text-xs text-foreground leading-relaxed flex-1">{item.name}</p>
        </div>
      ))}
    </div>
  </div>
);

const QASection: React.FC<{ data?: Record<string, any> }> = ({ data: sectionData }) => {
  if (!sectionData || typeof sectionData !== "object" || Object.keys(sectionData).length === 0) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Object.entries(sectionData).map(([key, value]) => {
        const title = key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

        // 1. Array of items
        if (Array.isArray(value) && value.length > 0) {
          const items = value.map((v: any) =>
            typeof v === "object" && v !== null
              ? v
              : { name: String(v), count: 0, percentage: 0 }
          );
          // Detect plain text (strings converted to objects with count=0, percentage=0)
          // → render as quote list, not rank bars
          const isTextList = items.every((i: any) => (i.count === 0 || i.count === undefined) && (i.percentage === 0 || i.percentage === undefined));
          return (
            <div key={key}>
              {isTextList
                ? <TextQuoteList title={title} items={items} />
                : <RankItems title={title} items={items} />}
            </div>
          );
        }

        // 2. Plain number/string scalar
        if (typeof value === "string" || typeof value === "number") {
          return (
            <div key={key} className="bg-card rounded-xl border border-border p-4 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{title}</p>
              <p className="text-sm font-bold text-foreground">{String(value)}</p>
            </div>
          );
        }

        // 3. Plain object with primitive values (e.g. {PKB: 205, Gerindra: 308})
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          const vals = Object.values(value);
          const allPrimitive = vals.every(v => typeof v === "string" || typeof v === "number");
          if (allPrimitive) {
            const items = Object.entries(value).map(([name, count]) => ({
              name,
              count: Number(count),
              percentage: Number(count),
            }));
            if (items.length > 0) return <div key={key}><RankItems title={title} items={items} /></div>;
          }
        }

        return null;
      })}
    </div>
  );
};

// ── Slide fallback helpers ─────────────────────────────────────────────────────

/** Convert IKM indicators to a QASection-compatible record (label → score 0–100) */
const indicatorsToQA = (indicators: { label: string; avg: number }[]): Record<string, number> =>
  Object.fromEntries(indicators.map(ind => [ind.label, Number(((ind.avg / 4) * 100).toFixed(1))]));

const formatDateSafe = (timestamp?: string | null, includeTime: boolean = false): string => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? "-" : (includeTime ? date.toLocaleString("id-ID") : date.toLocaleDateString("id-ID"));
};

/** Build surveyor stats from respondents when question_analysis.surveyor_validation is missing */
const buildSurveyorStats = (respondents: Respondent[]): Record<string, any> => {
  const bySurveyor: Record<string, { count: number; scores: number[] }> = {};
  const byProvince: Record<string, number> = {};
  for (const r of respondents) {
    const sv = r.surveyor ?? "Tidak Diketahui";
    if (!bySurveyor[sv]) bySurveyor[sv] = { count: 0, scores: [] };
    bySurveyor[sv].count++;
    if (r.score_average != null) bySurveyor[sv].scores.push(r.score_average);
    const prov = r.province ?? (r.location as string | undefined) ?? "Tidak Diketahui";
    byProvince[prov] = (byProvince[prov] ?? 0) + 1;
  }
  const surveyorList = Object.entries(bySurveyor).map(([name, d]) => ({
    name,
    count: d.count,
    percentage: d.count,
  }));
  const avgScoreList = Object.entries(bySurveyor)
    .filter(([, d]) => d.scores.length > 0)
    .map(([name, d]) => ({
      name,
      percentage: Number((d.scores.reduce((a, b) => a + b, 0) / d.scores.length).toFixed(2)),
    }));
  const provinceList = Object.entries(byProvince).map(([name, count]) => ({ name, count, percentage: count }));
  return {
    ...(surveyorList.length ? { jumlah_kuesioner_per_surveyor: surveyorList } : {}),
    ...(avgScoreList.length ? { rata_rata_skor_per_surveyor: avgScoreList } : {}),
    ...(provinceList.length ? { sebaran_provinsi: provinceList } : {}),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

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
  const surveyDashConfig = config
    ? buildConfigFromSurvey(config)
    : getSurveyDashboardConfig(id ?? "");
  const dashboardSummary = resolveSurveyDashboard(
    surveyDashConfig,
    data?.indicators ?? undefined,
    data ?? undefined
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled && config) {
      interval = setInterval(() => {
        fetchData(config.scriptUrl, config.presentationMode);
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

  const fetchData = async (url: string, presentationMode?: boolean) => {
    if (!url || url === "undefined" || url === "null" || url.trim() === "") {
      setError("URL Script tidak valid atau belum dikonfigurasi. Silakan periksa pengaturan survei di Management Console.");
      return;
    }

    try {
      const params = new URLSearchParams({ scriptUrl: url });
      if (presentationMode) params.set("mode", "presentation");
      const resp = await axios.get(`/api/survey-data?${params.toString()}`);

      // Debug log
      console.group("[SurveyDash] fetchData response");
      console.log("meta:", resp.data?.meta);
      console.log("ikm:", resp.data?.ikm);
      console.log("candidate_preference keys:", Object.keys(resp.data?.candidate_preference ?? {}));
      console.log("question_analysis keys:", Object.keys(resp.data?.question_analysis ?? {}));
      console.log("respondents count:", resp.data?.respondents?.length ?? 0);
      console.log("mode:", params.get("mode") ?? "sheet");
      console.groupEnd();

      // Check for updates for Super Admin
      if (role === "SUPER_ADMIN" && data && JSON.stringify(data) !== JSON.stringify(resp.data)) {
        setLastNotification({ message: "Data survei telah diperbarui otomatis.", type: "info" });
        setTimeout(() => setLastNotification(null), 5000);
      }

      if (!resp.data?.meta) {
        const errDetail = resp.data?.error ?? (typeof resp.data === "string" ? resp.data.slice(0, 200) : JSON.stringify(resp.data).slice(0, 200));
        setError(`Apps Script mengembalikan data tidak valid (tidak ada field 'meta'): ${errDetail}. Pastikan code.gs sudah dideploy dan doGet() mengembalikan JSON yang benar.`);
        return;
      }

      setData(resp.data);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      const serverError = typeof err.response?.data === "object"
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
          agency: "Instansi Pelayanan Publik",
          period: "2026",
          scriptUrl: "demo",
          isActive: true,
          createdAt: new Date(),
          createdBy: "system",
          visibility: "PUBLIC"
        };
        setConfig(demoConfig);
        await fetchData("demo", false);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "surveys", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cfg = { id: snap.id, ...snap.data() } as SurveyConfig;
          setConfig(cfg);
          await fetchData(cfg.scriptUrl, cfg.presentationMode);
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
    await fetchData(config.scriptUrl, config.presentationMode);
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

  const isElectoral = data.meta?.survey_type === 'ELECTORAL';

  const toChartData = (obj: Record<string, number> | undefined) =>
    obj ? Object.entries(obj).map(([name, value]) => ({ name, value })) : [];

  const demoGenderData    = toChartData(data.demographics?.gender);
  const demoEduData       = toChartData(data.demographics?.pendidikan ?? data.demographics?.education as any);
  const demoUmurData      = toChartData(data.demographics?.umur);
  const demoPekerjaanData = toChartData(data.demographics?.pekerjaan);
  const demoSukuData      = toChartData(data.demographics?.suku);
  const demoAgamaData     = toChartData(data.demographics?.agama);
  const demoPenghasilan   = toChartData(data.demographics?.penghasilan);
  const demoAfiliasiData  = toChartData(data.demographics?.afiliasi_politik);
  const demoDesaKotaData  = toChartData(data.demographics?.desa_kota);
  const demoProvinsiData  = toChartData(data.demographics?.provinsi);
  const demoLayananData   = toChartData(data.demographics?.layanan);
  const demoLokasiData    = toChartData(data.demographics?.location
    ? data.demographics.location
    : undefined);

  const COLORS_GOOGLE = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043', '#9E9D24', '#5C6BC0', '#E91E63', '#795548', '#607D8B', '#F06292', '#AED581', '#FFD54F', '#4DD0E1', '#CE93D8', '#FFAB91', '#80CBC4', '#BCAAA4'];

  const sortDesc = (arr: {name: string; value: number}[]) => [...arr].sort((a, b) => b.value - a.value);

  const PieListCard = ({ id, title, data: chartData }: { id: string; title: string; data: {name: string; value: number}[] }) => {
    const sorted = sortDesc(chartData);
    const total = sorted.reduce((s, d) => s + d.value, 0);
    return (
      <Card id={id} className="overflow-hidden border border-border/60 shadow-sm rounded-xl bg-card">
        <CardHeader className="flex flex-row items-start justify-between pb-0 pt-5 px-6">
          <div className="space-y-1">
            <CardTitle className="text-base font-normal">{title}</CardTitle>
            <CardDescription className="text-xs">{total} responses</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-[#4285F4] hover:bg-blue-50 dark:hover:bg-blue-950/50 font-medium text-xs" onClick={() => downloadPNG(id, `${id}_${config?.id}`)}>
              <Copy className="w-3.5 h-3.5" /><span className="hidden sm:inline">Copy</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => exportToCSV(sorted, `${id}_${config?.id}`)}>
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex gap-4 p-4 pt-2 items-center">
          <div className="w-[180px] h-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sorted} dataKey="value" cx="50%" cy="50%" outerRadius={85} labelLine={false} stroke="hsl(var(--background))" strokeWidth={1}>
                  {sorted.map((_, i) => <Cell key={i} fill={COLORS_GOOGLE[i % COLORS_GOOGLE.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ScrollArea className="flex-1 h-[220px]">
            <div className="space-y-1 pr-2">
              {sorted.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS_GOOGLE[i % COLORS_GOOGLE.length] }} />
                  <span className="flex-1 text-foreground/80 leading-tight text-[11px]">{d.name}</span>
                  <span className="font-black tabular-nums">{d.value}</span>
                  <span className="text-muted-foreground w-9 text-right">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  // ── Slide visibility (reads from Firestore config, falls back to defaults) ──
  const slideVis: SlideVisibility = {
    ...DEFAULT_SLIDE_VISIBILITY,
    ...(config.slideVisibility ?? {}),
  };

  const SLIDE_ORDER: Array<{ key: keyof SlideVisibility; value: string }> = [
    { key: "summary", value: "summary" },
    { key: "indicators", value: "indicators" },
    { key: "demographics", value: "demographics" },
    { key: "publicExpectation", value: "public" },
    { key: "respondents", value: "respondents" },
    { key: "nationalLeadership", value: "nationalLeadership" },
    { key: "leaderFigures", value: "leaderFigures" },
    { key: "presidentialElectability", value: "presidentialElectability" },
    { key: "presidentialSimulation", value: "presidentialSimulation" },
    { key: "partyElectability", value: "partyElectability" },
    { key: "governmentPerformance", value: "governmentPerformance" },
    { key: "voterBehavior", value: "voterBehavior" },
    { key: "publicEmotion", value: "publicEmotion" },
    { key: "surveyorValidation", value: "surveyorValidation" },
    { key: "rawData", value: "rawData" },
  ];
  const firstActiveTab = SLIDE_ORDER.find(s => slideVis[s.key])?.value ?? "indicators";

  const INDIKATOR_OPTIONS = [
    ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
    ["Tidak Mudah", "Kurang Mudah", "Mudah", "Sangat Mudah"],
    ["Tidak Cepat", "Kurang Cepat", "Cepat", "Sangat Cepat"],
    ["Sangat Mahal", "Cukup Mahal", "Murah", "Gratis"],
    ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
    ["Tidak Kompeten", "Kurang", "Kompeten", "Sangat Kompeten"],
    ["Tidak Sopan", "Kurang Sopan", "Sopan", "Sangat Sopan"],
    ["Tidak Ada", "Kurang Berfungsi", "Berfungsi", "Dikelola Baik"],
    ["Buruk", "Cukup", "Baik", "Sangat Baik"]
  ];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    if (percent * 100 < 4) return null;
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  const GoogleFormChartCard = ({ id, title, data, type = "pie" }: { id: string, title: string, data: any[], type?: "pie" | "bar" | "bar-horizontal" }) => {
    const totalResponses = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    return (
      <Card id={id} className="overflow-hidden border border-border/60 shadow-sm rounded-xl bg-card">
        <CardHeader className="flex flex-row items-start justify-between pb-0 pt-6 px-6 sm:px-8">
          <div className="space-y-1.5">
            <CardTitle className="text-base md:text-lg font-normal text-foreground">{title}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{totalResponses} responses</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 text-[#4285F4] hover:text-[#4285F4] hover:bg-blue-50 dark:hover:bg-blue-950/50 font-medium" onClick={() => downloadPNG(id, `${id}_${config?.id}`)}>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy chart</span>
            </Button>
            <Button variant="ghost" size="sm" title="Download CSV" className="h-9 w-9 p-0 text-muted-foreground" onClick={() => exportToCSV(data, `${id}_data_${config?.id}`)}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[320px] min-h-[320px] flex items-center justify-center p-0 pb-4 relative">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {type === "pie" ? (
                <PieChart>
                  <Pie
                    data={data}
                    cx="40%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={110}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {data.map((entry, index) => {
                      let color = COLORS_GOOGLE[index % COLORS_GOOGLE.length];
                      const name = entry.name.toLowerCase();
                      if (title === "Jenis Kelamin") {
                        if (name.includes('laki') || name.includes('pria')) color = COLORS_GOOGLE[0]; 
                        else if (name.includes('perempuan') || name.includes('wanita')) color = COLORS_GOOGLE[1];
                      }
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right" 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '13px', color: 'currentColor', right: '5%', width: '30%' }} 
                  />
                </PieChart>
              ) : type === "bar" ? (
                <BarChart data={data} margin={{ left: 0, right: 30, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'currentColor' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(128,128,128,0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_GOOGLE[index % COLORS_GOOGLE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.15} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={11} axisLine={false} tickLine={false} width={110} tick={{ fill: 'currentColor' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(128,128,128,0.1)'}} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_GOOGLE[index % COLORS_GOOGLE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
              Tidak ada data
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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
    <div className="p-4 max-w-[1400px] mx-auto space-y-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass rounded-[1.5rem] overflow-hidden relative group p-5 border-white/20 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <LucideBarChart className="w-48 h-48 animate-float text-primary/30" />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <Link to="/dashboard">
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 glass border-white/20 hover:scale-110 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 uppercase text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full">
                 {data?.meta?.period ?? dashboardSummary.period}
               </Badge>
               <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-muted/30 px-3 py-1 rounded-full backdrop-blur-sm border border-border/50">
                 <RefreshCw className="w-3 h-3 animate-spin-slow" />
                 Sinkronisasi: {data?.meta?.last_updated ? new Date(data.meta.last_updated).toLocaleString("id-ID") : "—"}
               </div>
             </div>
               <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-gradient uppercase leading-none mt-1">{data?.meta?.survey_name ?? dashboardSummary.title}</h2>
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
                <Button variant="outline" className="gap-2 font-bold text-[10px] md:text-xs h-9 px-3 rounded-xl border-primary/20 hover:bg-primary/5 transition-all">
                  <Share2 className="w-3.5 h-3.5" />
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

          {/* Only Admin / Super Admin can see presentation mode */}
          {(role === "SUPER_ADMIN" || role === "ADMIN") && (
            <Link to={`/survey/${id}/presentation`}>
              <Button 
                className="gap-2 font-bold text-[10px] md:text-xs h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-lg shadow-purple-600/20"
              >
                <MonitorPlay className="w-4 h-4" />
                Mode Presentasi
              </Button>
            </Link>
          )}

          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="gap-2 font-bold text-[10px] md:text-xs h-9 px-4 rounded-xl border-primary/20 hover:border-primary transition-all hidden sm:flex"
          >
            <PieChartIcon className="w-4 h-4" />
            Cetak PDF
          </Button>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="gap-2 font-black text-[10px] md:text-xs h-9 px-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "SINKRONISASI..." : "REFRESH DATA"}
          </Button>

          <Button 
            variant={autoRefreshEnabled ? "default" : "outline"}
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`gap-2 font-black text-[10px] md:text-xs h-9 px-3 rounded-xl transition-all border-primary/20 ${autoRefreshEnabled ? 'bg-emerald-500 hover:bg-emerald-600 border-none' : ''}`}
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
          { label: "Margin of Error", value: config.samplingConfig?.marginOfError ? `±${(config.samplingConfig.marginOfError * 100).toFixed(2)}%` : "±N/A", icon: Info, color: "text-blue-500" },
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
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tighter">{data?.meta?.total_respondents ?? dashboardSummary.totalRespondents}</CardTitle>
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
            backgroundColor: dashboardSummary.indexScore >= 88.31 ? '#10b981' : dashboardSummary.indexScore >= 76.61 ? '#3b82f6' : dashboardSummary.indexScore >= 65.00 ? '#f59e0b' : '#ef4444'
          }} />
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Indeks Kepuasan (NIK)</CardDescription>
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tighter" style={{
              color: dashboardSummary.indexScore >= 88.31 ? '#10b981' : dashboardSummary.indexScore >= 76.61 ? '#3b82f6' : dashboardSummary.indexScore >= 65.00 ? '#f59e0b' : '#ef4444'
            }}>{dashboardSummary.indexScore.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
             <Badge className="hover:opacity-90 border-none font-black px-4 py-1.5 rounded-full uppercase tracking-wider text-xs text-white" style={{
               backgroundColor: dashboardSummary.indexScore >= 88.31 ? '#10b981' : dashboardSummary.indexScore >= 76.61 ? '#3b82f6' : dashboardSummary.indexScore >= 65.00 ? '#f59e0b' : '#ef4444'
             }}>
               Mutu {dashboardSummary.qualityLabel} — {dashboardSummary.qualityCategory}
             </Badge>
             <p className="text-[10px] text-muted-foreground mt-2 font-mono">
               Nilai Interval: {dashboardSummary.qualityInterval}
             </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/50" />
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Target Mutu</CardDescription>
            <CardTitle className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{dashboardSummary.targetScore.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 text-xs text-muted-foreground font-black uppercase tracking-wider bg-emerald-500/10 w-fit px-3 py-1 rounded-full border border-emerald-500/20">
               <TrendingUp className="w-4 h-4 text-emerald-500" />
               Gap: {dashboardSummary.gap.toFixed(2)} poin
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

      <Tabs defaultValue={firstActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-muted p-1 inline-flex h-auto gap-0.5 min-w-max flex-nowrap">
            {slideVis.summary && <TabsTrigger value="summary" className="gap-1.5 text-xs whitespace-nowrap"><FileText className="w-3.5 h-3.5" />Ringkasan</TabsTrigger>}
            {slideVis.indicators && <TabsTrigger value="indicators" className="gap-1.5 text-xs whitespace-nowrap"><LucideBarChart className="w-3.5 h-3.5" />9 Indikator IKM</TabsTrigger>}
            {slideVis.demographics && <TabsTrigger value="demographics" className="gap-1.5 text-xs whitespace-nowrap"><PieChartIcon className="w-3.5 h-3.5" />Demografi</TabsTrigger>}
            {slideVis.publicExpectation && <TabsTrigger value="public" className="gap-1.5 text-xs whitespace-nowrap"><MessageSquare className="w-3.5 h-3.5" />Harapan Publik</TabsTrigger>}
            {slideVis.respondents && <TabsTrigger value="respondents" className="gap-1.5 text-xs whitespace-nowrap"><Users className="w-3.5 h-3.5" />Daftar Responden</TabsTrigger>}
            {slideVis.nationalLeadership && <TabsTrigger value="nationalLeadership" className="gap-1.5 text-xs whitespace-nowrap"><Award className="w-3.5 h-3.5" />Kepemimpinan Nasional</TabsTrigger>}
            {slideVis.leaderFigures && <TabsTrigger value="leaderFigures" className="gap-1.5 text-xs whitespace-nowrap"><UserCheck className="w-3.5 h-3.5" />Tokoh & Figur</TabsTrigger>}
            {slideVis.presidentialElectability && <TabsTrigger value="presidentialElectability" className="gap-1.5 text-xs whitespace-nowrap"><TrendingUp className="w-3.5 h-3.5" />Elektabilitas Capres</TabsTrigger>}
            {slideVis.presidentialSimulation && <TabsTrigger value="presidentialSimulation" className="gap-1.5 text-xs whitespace-nowrap"><Shuffle className="w-3.5 h-3.5" />Simulasi Capres</TabsTrigger>}
            {slideVis.partyElectability && <TabsTrigger value="partyElectability" className="gap-1.5 text-xs whitespace-nowrap"><Flag className="w-3.5 h-3.5" />Elektabilitas Parpol</TabsTrigger>}
            {slideVis.governmentPerformance && <TabsTrigger value="governmentPerformance" className="gap-1.5 text-xs whitespace-nowrap"><Building2 className="w-3.5 h-3.5" />Kinerja Pemerintah</TabsTrigger>}
            {slideVis.voterBehavior && <TabsTrigger value="voterBehavior" className="gap-1.5 text-xs whitespace-nowrap"><Users className="w-3.5 h-3.5" />Perilaku Pemilih</TabsTrigger>}
            {slideVis.publicEmotion && <TabsTrigger value="publicEmotion" className="gap-1.5 text-xs whitespace-nowrap"><Heart className="w-3.5 h-3.5" />Emosi Publik</TabsTrigger>}
            {slideVis.surveyorValidation && <TabsTrigger value="surveyorValidation" className="gap-1.5 text-xs whitespace-nowrap"><ShieldCheck className="w-3.5 h-3.5" />Validasi Surveyor</TabsTrigger>}
            {slideVis.rawData && <TabsTrigger value="rawData" className="gap-1.5 text-xs whitespace-nowrap"><Database className="w-3.5 h-3.5" />Data Mentah</TabsTrigger>}
          </TabsList>
        </div>

        {/* ── Ringkasan Survei ── */}
        {slideVis.summary && (
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: "Judul Survei", value: dashboardSummary.title || config.name },
              { label: "Instansi", value: dashboardSummary.institution || config.agency },
              { label: "Periode", value: dashboardSummary.period || config.period },
              { label: "Total Responden", value: String(dashboardSummary.totalRespondents) },
              { label: "Margin of Error", value: dashboardSummary.marginOfError },
              { label: "Confidence Level", value: `${surveyDashConfig.confidenceLevel ?? 95}%` },
              { label: "Sampel Validitas", value: dashboardSummary.sampleValidity },
              { label: "Index Reliability", value: String(dashboardSummary.reliabilityIndex) },
              { label: "Trend Kepuasan", value: dashboardSummary.trend },
              { label: "Indeks Kepuasan (NIK)", value: dashboardSummary.indexScore.toFixed(2) },
              { label: "Target Mutu", value: dashboardSummary.targetScore.toFixed(2) },
              { label: "Gap", value: `${dashboardSummary.gap.toFixed(2)} poin` },
              { label: "Mutu", value: `${dashboardSummary.qualityLabel} — ${dashboardSummary.qualityCategory}` },
              { label: "Nilai Interval", value: dashboardSummary.qualityInterval },
              { label: "Mode Data", value: surveyDashConfig.presentationMode ? "Mode Data Presentasi" : "Data Aktual" },
            ].map(item => (
              <div key={item.label} className="bg-card rounded-xl border border-border p-4 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold text-foreground leading-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </TabsContent>
        )}

        {/* ── 9 Indikator IKM ── */}
        {slideVis.indicators && (
        <TabsContent value="indicators" className="space-y-4">
          {isElectoral ? (
            /* ── ELECTORAL: Elektabilitas ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PieListCard id="chart-awareness"      title="1. Popularitas – Tingkat Pengenalan Capres (C1a)" data={toChartData((data as any).electability?.awareness)} />
              <PieListCard id="chart-likability"     title="2. Kesukaan – Tingkat Kesukaan Capres (C1b)"     data={toChartData((data as any).electability?.likability)} />
              <PieListCard id="chart-vote-intention" title="3. Elektabilitas – Pilihan Capres (C1c)"          data={toChartData((data as any).electability?.vote_intention)} />
            </div>
          ) : data.indicators && data.indicators.length > 0 ? (
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
               <CardContent className="h-[280px]">
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

            <div className="space-y-3 max-h-[350px] overflow-auto pr-2 custom-scrollbar">
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
                             {(INDIKATOR_OPTIONS[idx] || ["1", "2", "3", "4"]).map((label, i) => {
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
        )}

        {/* ── Demografi ── */}
        {slideVis.demographics && (
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
             <GoogleFormChartCard id="chart-gender"   title="Jenis Kelamin"        data={demoGenderData}    type="pie" />
             <GoogleFormChartCard id="chart-umur"     title="Kelompok Umur"         data={demoUmurData}      type="bar" />
             <GoogleFormChartCard id="chart-edu"      title="Pendidikan Terakhir"   data={demoEduData}       type="pie" />
             <GoogleFormChartCard id="chart-pekerjaan"title="Profesi / Pekerjaan"   data={demoPekerjaanData} type="bar-horizontal" />
             <PieListCard         id="chart-suku"     title="Suku / Etnis"          data={demoSukuData} />
             {isElectoral ? (
               <>
                 <GoogleFormChartCard id="chart-agama"     title="Agama"              data={demoAgamaData}    type="pie" />
                 <GoogleFormChartCard id="chart-penghasilan"title="Penghasilan per Bulan" data={demoPenghasilan} type="bar-horizontal" />
                 <PieListCard         id="chart-afiliasi"  title="Afiliasi Politik"   data={demoAfiliasiData} />
                 <GoogleFormChartCard id="chart-desakota"  title="Desa / Kota"        data={demoDesaKotaData} type="pie" />
                 <PieListCard         id="chart-provinsi"  title="Provinsi"           data={demoProvinsiData} />
               </>
             ) : (
               <>
                 <GoogleFormChartCard id="chart-layanan" title="Jenis Layanan"   data={demoLayananData} type="bar-horizontal" />
                 <GoogleFormChartCard id="chart-lokasi"  title="Lokasi Survei"   data={demoLokasiData}  type="bar" />
               </>
             )}
          </div>
        </TabsContent>
        )}

        {/* ── Harapan Publik ── */}
        {slideVis.publicExpectation && (
        <TabsContent value="public" className="space-y-6">
          {isElectoral ? (
            (() => {
              const elOpen = (data as any).electability?.open ?? {};
              const nlOpen = (data as any).national_leadership?.open ?? {};
              const publicItems = [
                { key: 'b1a', src: elOpen, label: 'Pilihan Capres & Alasan (B1a)', color: 'primary' },
                { key: 'b1b', src: elOpen, label: 'Capres Alternatif (B1b)', color: 'primary' },
                { key: 'b1c', src: elOpen, label: 'Capres Ideal 2029 (B1c)', color: 'primary' },
                { key: 'b1d', src: elOpen, label: 'Latar Belakang Capres Ideal (B1d)', color: 'primary' },
                { key: 'a2h', src: nlOpen, label: 'Tokoh Layak Jadi Pemimpin (A2h)', color: 'emerald' },
                { key: 'a2i', src: nlOpen, label: 'Tokoh Lain yang Layak (A2i)', color: 'emerald' },
                { key: 'a2j_ekonomi',    src: nlOpen, label: 'Tokoh Unggul Ekonomi (A2j)', color: 'blue' },
                { key: 'a2j_korupsi',    src: nlOpen, label: 'Tokoh Unggul Pemberantasan Korupsi (A2j)', color: 'blue' },
                { key: 'a2j_diplomasi',  src: nlOpen, label: 'Tokoh Unggul Diplomasi (A2j)', color: 'blue' },
                { key: 'a2j_pertahanan', src: nlOpen, label: 'Tokoh Unggul Pertahanan & Keamanan (A2j)', color: 'blue' },
                { key: 'a2j_kesra',      src: nlOpen, label: 'Tokoh Unggul Kesejahteraan Rakyat (A2j)', color: 'blue' },
              ].filter(({ key, src }) => (src[key]?.length ?? 0) > 0);
              return publicItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicItems.map(({ key, src, label, color }) => (
                    <Card key={key} className="h-[280px] flex flex-col border-none shadow-sm bg-muted/20">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-black">{label}</CardTitle></CardHeader>
                      <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-2">
                          <div className="space-y-2">
                            {src[key].map((t: string, i: number) => (
                              <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className={`text-xs italic text-foreground/80 border-l-2 pl-2 ${color === 'emerald' ? 'border-emerald-500/40' : color === 'blue' ? 'border-blue-500/40' : 'border-primary/40'}`}>
                                "{t}"
                              </motion.p>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
                  <p className="text-muted-foreground italic">Data harapan publik belum tersedia.</p>
                </div>
              );
            })()
          ) : data.open_ended ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-[400px] flex flex-col">
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

              <Card className="h-[400px] flex flex-col">
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
        )}

        {/* ── Daftar Responden ── */}
        {slideVis.respondents && (
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
                    answers: JSON.stringify(r.answers || {})
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
                    <div className="border rounded-xl overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="hidden md:table-cell">Lokasi</TableHead>
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
                              <TableCell className="hidden md:table-cell text-foreground/80">{r.location || "-"}</TableCell>
                              <TableCell className="hidden md:table-cell font-medium text-foreground/80">{r.surveyor || "-"}</TableCell>
                              <TableCell className="hidden lg:table-cell text-foreground/80">{r.gender}</TableCell>
                              <TableCell className="hidden lg:table-cell text-foreground/80">{r.education}</TableCell>
                              <TableCell className="text-muted-foreground text-xs font-medium">
                                {formatDateSafe(r.timestamp)}
                              </TableCell>
                              <TableCell className="text-right">
                                 <Dialog>
                                   <DialogTrigger render={
                                     <Button variant="outline" size="sm" className="h-7 text-xs font-bold">Detail Jawaban</Button>
                                   } />
                                   <DialogContent className="max-w-[480px] max-h-[85vh] p-4 flex flex-col gap-0">
                                     <DialogHeader className="space-y-1 shrink-0">
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
                                              const scores = Object.values(r.answers || {}).filter(v => typeof v === 'number') as number[];
                                              return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "0.00";
                                            })()}
                                          </div>
                                          <div className="text-muted-foreground">Waktu Pengisian</div>
                                          <div className="font-bold text-right text-[9px] text-foreground">{formatDateSafe(r.timestamp, true)}</div>
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
                                            {Object.entries(r.answers || {}).map(([key, val]) => (
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
        )}

        {/* ── Kepemimpinan Nasional ── */}
        {slideVis.nationalLeadership && (() => {
          const qaData = data?.question_analysis?.national_leadership;
          const cpData = data?.candidate_preference;
          const indFallback = data?.indicators?.length ? indicatorsToQA(data.indicators) : null;
          const openFallback = data?.open_ended?.general_opinion?.length
            ? { "Opini Umum Publik": data.open_ended.general_opinion.map((t, i) => ({ name: `${i + 1}`, label: t, percentage: 0 })) }
            : null;
          const hasData = qaData || cpData?.capres?.length || cpData?.politisi?.length || indFallback || openFallback;
          return (
            <TabsContent value="nationalLeadership">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />Kepemimpinan Nasional
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qaData ? <QASection data={qaData} /> : null}
                    {!qaData && cpData?.capres?.length ? <RankItems title="Elektabilitas Pemimpin Nasional" items={cpData.capres} /> : null}
                    {!qaData && cpData?.politisi?.length ? <RankItems title="Tokoh Politik" items={cpData.politisi} /> : null}
                    {!qaData && !cpData?.capres?.length && indFallback ? <QASection data={indFallback} /> : null}
                    {!qaData && !cpData?.capres?.length && !indFallback && openFallback ? <QASection data={openFallback} /> : null}
                  </> : <SlideEmptyState label="Kepemimpinan Nasional" icon={Award} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Tokoh & Figur ── */}
        {slideVis.leaderFigures && (() => {
          const qa = data?.question_analysis?.leader_figures;
          const cp = data?.candidate_preference;
          const hasCp = cp?.capres?.length || cp?.politisi?.length || cp?.tokoh?.length || cp?.profesional?.length;
          const hasData = qa || hasCp;
          return (
            <TabsContent value="leaderFigures">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />Tokoh & Figur Pemimpin
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {cp?.capres?.length ? <RankItems title="Calon Presiden" items={cp.capres} /> : null}
                    {cp?.tokoh?.length ? <RankItems title="Tokoh Nasional" items={cp.tokoh} /> : null}
                    {cp?.politisi?.length ? <RankItems title="Tokoh Politik" items={cp.politisi} /> : null}
                    {cp?.profesional?.length ? <RankItems title="Profesional / Teknokrat" items={cp.profesional} /> : null}
                  </> : <SlideEmptyState label="Tokoh & Figur Pemimpin" icon={UserCheck} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Elektabilitas Capres ── */}
        {slideVis.presidentialElectability && (() => {
          const qa = data?.question_analysis?.presidential_electability;
          const cp = data?.candidate_preference;
          const hasData = qa || cp?.capres?.length || cp?.capres_closed?.length || cp?.capres_alternative?.length
            || cp?.simulation_10?.length || cp?.simulation_8?.length || cp?.simulation_5?.length;
          return (
            <TabsContent value="presidentialElectability">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />Elektabilitas Calon Presiden
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {cp?.capres?.length ? <RankItems title="Elektabilitas Terbuka" items={cp.capres} /> : null}
                    {cp?.capres_alternative?.length ? <RankItems title="Elektabilitas Alternatif" items={cp.capres_alternative} /> : null}
                    {cp?.capres_closed?.length ? <RankItems title="Elektabilitas Tertutup" items={cp.capres_closed} /> : null}
                    {cp?.simulation_10?.length ? <RankItems title="Simulasi 10 Nama" items={cp.simulation_10} /> : null}
                    {cp?.simulation_8?.length ? <RankItems title="Simulasi 8 Nama" items={cp.simulation_8} /> : null}
                    {cp?.simulation_5?.length ? <RankItems title="Simulasi 5 Nama" items={cp.simulation_5} /> : null}
                  </> : <SlideEmptyState label="Elektabilitas Capres" icon={TrendingUp} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Simulasi Capres ── */}
        {slideVis.presidentialSimulation && (() => {
          const qa = data?.question_analysis?.presidential_simulation;
          const cp = data?.candidate_preference;
          const hasData = qa || cp?.simulation_10?.length || cp?.simulation_8?.length || cp?.simulation_5?.length
            || cp?.politisi?.length || cp?.tokoh?.length || cp?.profesional?.length;
          return (
            <TabsContent value="presidentialSimulation">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-primary" />Simulasi Calon Presiden
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {cp?.simulation_10?.length ? <RankItems title="Simulasi 10 Nama" items={cp.simulation_10} /> : null}
                    {cp?.simulation_8?.length ? <RankItems title="Simulasi 8 Nama" items={cp.simulation_8} /> : null}
                    {cp?.simulation_5?.length ? <RankItems title="Simulasi 5 Nama" items={cp.simulation_5} /> : null}
                    {!cp?.simulation_10?.length && !cp?.simulation_8?.length && !cp?.simulation_5?.length && cp?.politisi?.length ? <RankItems title="Tokoh Politik" items={cp.politisi} /> : null}
                    {!cp?.simulation_10?.length && !cp?.simulation_8?.length && !cp?.simulation_5?.length && cp?.tokoh?.length ? <RankItems title="Tokoh Nasional" items={cp.tokoh} /> : null}
                    {!cp?.simulation_10?.length && !cp?.simulation_8?.length && !cp?.simulation_5?.length && cp?.profesional?.length ? <RankItems title="Profesional / Teknokrat" items={cp.profesional} /> : null}
                  </> : <SlideEmptyState label="Simulasi Capres" icon={Shuffle} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Elektabilitas Parpol ── */}
        {slideVis.partyElectability && (() => {
          const qa = data?.question_analysis?.party_electability;
          const cp = data?.candidate_preference;
          const hasData = qa || cp?.parpol?.length || cp?.parpol_closed?.length;
          return (
            <TabsContent value="partyElectability">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Flag className="w-4 h-4 text-primary" />Elektabilitas Partai Politik
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {cp?.parpol?.length ? <RankItems title="Elektabilitas Terbuka" items={cp.parpol} /> : null}
                    {cp?.parpol_closed?.length ? <RankItems title="Elektabilitas Tertutup" items={cp.parpol_closed} /> : null}
                  </> : <SlideEmptyState label="Elektabilitas Parpol" icon={Flag} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Kinerja Pemerintah ── */}
        {slideVis.governmentPerformance && (() => {
          const qa = data?.question_analysis?.government_performance;
          const indFallback = data?.indicators?.length ? indicatorsToQA(data.indicators) : null;
          const openFallback = data?.open_ended?.expectations?.length
            ? data.open_ended.expectations.map((t, i) => ({ name: `Harapan ${i + 1}`, label: t, percentage: 0 }))
            : null;
          const hasData = qa || indFallback || openFallback;
          return (
            <TabsContent value="governmentPerformance">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />Kinerja Pemerintah
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {!qa && indFallback ? <><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Skor Indikator Layanan</p><QASection data={indFallback} /></> : null}
                    {!qa && !indFallback && openFallback ? <RankItems title="Harapan & Saran Publik" items={openFallback} /> : null}
                  </> : <SlideEmptyState label="Kinerja Pemerintah" icon={Building2} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Perilaku Pemilih ── */}
        {slideVis.voterBehavior && (() => {
          const qa = data?.question_analysis?.voter_behavior;
          const cp = data?.candidate_preference;
          const indFallback = data?.indicators?.length ? indicatorsToQA(data.indicators) : null;
          const hasData = qa || cp?.capres?.length || cp?.parpol?.length || indFallback;
          return (
            <TabsContent value="voterBehavior">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />Perilaku Pemilih
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {!qa && cp?.capres?.length ? <RankItems title="Pilihan Capres" items={cp.capres} /> : null}
                    {!qa && cp?.parpol?.length ? <RankItems title="Pilihan Partai" items={cp.parpol} /> : null}
                    {!qa && !cp?.capres?.length && !cp?.parpol?.length && indFallback ? <QASection data={indFallback} /> : null}
                  </> : <SlideEmptyState label="Perilaku Pemilih" icon={Users} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Emosi Publik ── */}
        {slideVis.publicEmotion && (() => {
          const qa = data?.question_analysis?.public_emotion;
          const cp = data?.candidate_preference;
          const openFallback = data?.open_ended?.general_opinion?.length
            ? data.open_ended.general_opinion.map((t, i) => ({ name: `Opini ${i + 1}`, label: t, percentage: 0 }))
            : null;
          const hasData = qa || cp?.tokoh?.length || cp?.capres?.length || openFallback;
          return (
            <TabsContent value="publicEmotion">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />Emosi Publik Terhadap Tokoh
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                  {hasData ? <>
                    {qa ? <QASection data={qa} /> : null}
                    {!qa && cp?.tokoh?.length ? <RankItems title="Tokoh yang Disukai Publik" items={cp.tokoh} /> : null}
                    {!qa && !cp?.tokoh?.length && cp?.capres?.length ? <RankItems title="Figur Capres" items={cp.capres} /> : null}
                    {!qa && !cp?.tokoh?.length && !cp?.capres?.length && openFallback ? <RankItems title="Opini Umum Publik" items={openFallback} /> : null}
                  </> : <SlideEmptyState label="Emosi Publik Terhadap Tokoh" icon={Heart} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Validasi Surveyor ── */}
        {slideVis.surveyorValidation && (() => {
          const qa = data?.question_analysis?.surveyor_validation;
          const respFallback = data?.respondents?.length ? buildSurveyorStats(data.respondents) : null;
          const hasData = qa || (respFallback && Object.keys(respFallback).length > 0);
          return (
            <TabsContent value="surveyorValidation">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="pb-3 px-0">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />Validasi Surveyor & Quality Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  {hasData ? (
                    qa ? <QASection data={qa} /> : <QASection data={respFallback!} />
                  ) : <SlideEmptyState label="Validasi Surveyor & Quality Control" icon={ShieldCheck} />}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })()}

        {/* ── Data Mentah ── */}
        {slideVis.rawData && (
          <TabsContent value="rawData">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-3 px-0">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />Data Mentah / Audit Responden
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {data?.respondents && data.respondents.length > 0
                  ? <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 border-b border-border">
                          <tr>
                            <th className="px-3 py-2 text-left font-black text-[10px] uppercase tracking-wider">ID</th>
                            <th className="px-3 py-2 text-left font-black text-[10px] uppercase tracking-wider">Nama</th>
                            <th className="px-3 py-2 text-left font-black text-[10px] uppercase tracking-wider">Timestamp</th>
                            <th className="px-3 py-2 text-left font-black text-[10px] uppercase tracking-wider">Jenis Kelamin</th>
                            <th className="px-3 py-2 text-left font-black text-[10px] uppercase tracking-wider">Pendidikan</th>
                            <th className="px-3 py-2 text-left font-black text-[10px] uppercase tracking-wider">Rata-rata Skor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.respondents.map((r, idx) => (
                            <tr key={r.id ?? idx} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-mono text-muted-foreground">{r.id}</td>
                              <td className="px-3 py-2 font-semibold">{r.name ?? "–"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDateSafe(r.timestamp, true)}</td>
                              <td className="px-3 py-2">{r.gender ?? "–"}</td>
                              <td className="px-3 py-2">{r.education ?? "–"}</td>
                              <td className="px-3 py-2 font-black text-primary">{r.score_average != null ? r.score_average.toFixed(2) : "–"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  : <SlideEmptyState label="Data Mentah / Audit Responden" icon={Database} />}
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
};


