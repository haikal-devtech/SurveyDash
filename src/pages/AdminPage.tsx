import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SurveyConfig, UserProfile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit3, Shield, User as UserIcon, Check, X, Users, Settings2, Globe, BarChart2, RotateCcw, Save, Info } from "lucide-react";
import {
  DashboardSummaryConfig,
  DEFAULT_DASHBOARD_SUMMARY_CONFIG,
  getDashboardSummaryConfig,
  saveDashboardSummaryConfig,
  resetDashboardSummaryConfig,
  calculateSlovinMarginError,
  calculateGap,
  getQualityByScore,
} from "@/lib/dashboard-summary-config";

export const AdminPage: React.FC = () => {
  const { user, role } = useAuth();
  const [surveys, setSurveys] = useState<SurveyConfig[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New Survey Form State
  const [newSurvey, setNewSurvey] = useState({
    name: "",
    agency: "Sekretariat Daerah",
    period: "Triwulan I 2026",
    scriptUrl: "",
    visibility: "PRIVATE" as const
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState<string | null>(null);
  const [surveyToDelete, setSurveyToDelete] = useState<SurveyConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyConfig | null>(null);
  const [isUpdatingSurvey, setIsUpdatingSurvey] = useState(false);

  // Dashboard Summary Config State
  const [dashConfig, setDashConfig] = useState<DashboardSummaryConfig>(() => getDashboardSummaryConfig());
  const [dashSaveStatus, setDashSaveStatus] = useState<"idle" | "saved" | "reset">("idle");

  const derivedMarginOfError = calculateSlovinMarginError(dashConfig.population, dashConfig.totalRespondents);
  const derivedGap = calculateGap(dashConfig.targetScore, dashConfig.indexScore);
  const derivedQuality = getQualityByScore(dashConfig.indexScore);

  const handleDashSave = () => {
    saveDashboardSummaryConfig(dashConfig);
    setDashSaveStatus("saved");
    setTimeout(() => setDashSaveStatus("idle"), 2500);
  };

  const handleDashReset = () => {
    const defaultCfg = resetDashboardSummaryConfig();
    setDashConfig(defaultCfg);
    setDashSaveStatus("reset");
    setTimeout(() => setDashSaveStatus("idle"), 2500);
  };

  const updateDash = (patch: Partial<DashboardSummaryConfig>) =>
    setDashConfig(prev => ({ ...prev, ...patch }));

  const handlePromoteUser = async (uId: string, newRole: "SUPER_ADMIN" | "ADMIN" | "VIEWER") => {
    setIsUpdatingUser(uId);
    try {
      await updateDoc(doc(db, "users", uId), { role: newRole });
      setUsers(users.map(u => u.id === uId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error promoting user:", err);
      alert("Gagal memperbarui pangkatan. Periksa koneksi atau izin.");
    } finally {
      setIsUpdatingUser(null);
    }
  };

  useEffect(() => {
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") return;

    const fetchData = async () => {
      try {
        const [surveySnap, userSnap] = await Promise.all([
          getDocs(collection(db, "surveys")),
          getDocs(collection(db, "users"))
        ]);

        setSurveys(surveySnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SurveyConfig)));
        setUsers(userSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as UserProfile)));
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role]);

  const handleAddSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Simple scriptUrl validation
    try {
      new URL(newSurvey.scriptUrl);
    } catch {
      if (newSurvey.scriptUrl !== "demo") {
        alert("URL Script tidak valid. Pastikan diawali dengan http:// atau https://");
        return;
      }
    }

    setIsAdding(true);
    try {
      const surveyStore = {
        ...newSurvey,
        isActive: true,
        visibility: newSurvey.visibility || "PRIVATE",
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        lastFetched: null
      };
      const docRef = await addDoc(collection(db, "surveys"), surveyStore);
      setSurveys([...surveys, { id: docRef.id, ...surveyStore, createdAt: new Date() } as SurveyConfig]);
      setNewSurvey({ name: "", agency: "Sekretariat Daerah", period: "Triwulan I 2026", scriptUrl: "", visibility: "PRIVATE" });
      alert("Survei berhasil didaftarkan!");
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan survei.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "surveys", surveyToDelete.id));
      setSurveys(surveys.filter(s => s.id !== surveyToDelete.id));
      setSurveyToDelete(null);
      alert("Survei berhasil dihapus.");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`Gagal menghapus: ${err.message}. Pastikan Anda memiliki izin Super Admin.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSurvey) return;
    setIsUpdatingSurvey(true);
    try {
      const docRef = doc(db, "surveys", editingSurvey.id);
      await updateDoc(docRef, {
        name: editingSurvey.name,
        agency: editingSurvey.agency,
        period: editingSurvey.period,
        scriptUrl: editingSurvey.scriptUrl,
        visibility: editingSurvey.visibility
      });
      setSurveys(surveys.map(s => s.id === editingSurvey.id ? editingSurvey : s));
      setEditingSurvey(null);
      alert("Survei berhasil diperbarui!");
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui survei.");
    } finally {
      setIsUpdatingSurvey(false);
    }
  };

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return <div className="p-20 text-center">Akses ditolak. Hanya Admin.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest mb-1">
            <Shield className="w-3 h-3" />
            Admin Console
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Management Console</h2>
          <p className="text-muted-foreground">Kelola survei, pengguna, dan hak akses dashboard.</p>
        </div>
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">
              Selamat Datang &bull; {new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-sm font-bold text-foreground">{user?.email}</p>
            <p className="text-[9px] italic text-primary/70 mt-1">"Data is a precious thing and will last longer than the systems themselves."</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="surveys" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="surveys" className="gap-2">
            <Globe className="w-4 h-4" />
            Survei Aktif
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Pengguna & Akses
          </TabsTrigger>
          <TabsTrigger value="dashboard-config" className="gap-2">
            <BarChart2 className="w-4 h-4" />
            Ringkasan Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="surveys" className="space-y-6">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger render={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Daftarkan Survei Baru
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Survei Baru</DialogTitle>
                  <DialogDescription>Masukkan detail survei dan URL Google Apps Script yang sudah dideploy.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSurvey} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Survei</label>
                    <Input placeholder="Contoh: SKM Layanan Kebencanaan" required value={newSurvey.name} onChange={e => setNewSurvey({ ...newSurvey, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instansi / Unit Kerja</label>
                    <Input placeholder="Nama Instansi / Unit Kerja" required value={newSurvey.agency} onChange={e => setNewSurvey({ ...newSurvey, agency: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Periode</label>
                    <Input placeholder="Triwulan I 2026" required value={newSurvey.period} onChange={e => setNewSurvey({ ...newSurvey, period: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL Script (Web App)</label>
                    <Input placeholder="https://script.google.com/macros/s/.../exec" required value={newSurvey.scriptUrl} onChange={e => setNewSurvey({ ...newSurvey, scriptUrl: e.target.value })} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isAdding}>
                      {isAdding ? "Menyimpan..." : "Simpan Survei"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Survei</TableHead>
                  <TableHead>Instansi</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Akses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.agency}</TableCell>
                    <TableCell><Badge variant="outline">{s.period}</Badge></TableCell>
                    <TableCell>
                      {s.visibility === "PUBLIC" ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 uppercase text-[10px] font-black">
                          Publik
                        </Badge>
                      ) : s.visibility === "LINK_ONLY" ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 uppercase text-[10px] font-black">
                          Link Sahaja
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground uppercase text-[10px] font-black">
                          Privat
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={s.isActive ? "bg-emerald-500" : "bg-slate-400"}>
                        {s.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => setEditingSurvey(s)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setSurveyToDelete(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {surveys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                      Belum ada survei terdaftar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard-config" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black">Pengaturan Ringkasan Dashboard</CardTitle>
                  <CardDescription className="mt-1">
                    Konfigurasi metric utama yang ditampilkan di ringkasan dashboard. Beberapa nilai dihitung otomatis berdasarkan rumus.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleDashReset}>
                    <RotateCcw className="w-4 h-4" />
                    Reset ke Default
                  </Button>
                  <Button size="sm" className="gap-2" onClick={handleDashSave}>
                    <Save className="w-4 h-4" />
                    {dashSaveStatus === "saved" ? "Tersimpan!" : dashSaveStatus === "reset" ? "Direset!" : "Simpan Perubahan"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* Manual Override Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/40">
                <div className="space-y-1">
                  <p className="text-sm font-black">Gunakan Nilai Manual</p>
                  <p className="text-xs text-muted-foreground">Aktifkan untuk mengisi Margin of Error, Gap, Mutu, Kategori, dan Nilai Interval secara manual.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dashConfig.useManualOverride}
                  onClick={() => updateDash({ useManualOverride: !dashConfig.useManualOverride })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${dashConfig.useManualOverride ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${dashConfig.useManualOverride ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Populasi (N)</label>
                  <Input
                    type="number"
                    value={dashConfig.population}
                    onChange={e => updateDash({ population: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Responden (n)</label>
                  <Input
                    type="number"
                    value={dashConfig.totalRespondents}
                    onChange={e => updateDash({ totalRespondents: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Confidence Level (%)</label>
                  <Input
                    type="number"
                    value={dashConfig.confidenceLevel}
                    onChange={e => updateDash({ confidenceLevel: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tingkat Partisipasi</label>
                  <Input
                    value={dashConfig.participationRate}
                    onChange={e => updateDash({ participationRate: e.target.value })}
                    placeholder="94%"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Index Reliability</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dashConfig.reliabilityIndex}
                    onChange={e => updateDash({ reliabilityIndex: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Trend Kepuasan</label>
                  <Input
                    value={dashConfig.trend}
                    onChange={e => updateDash({ trend: e.target.value })}
                    placeholder="+4.2%"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Sampel Validitas</label>
                  <Input
                    value={dashConfig.sampleValidity}
                    onChange={e => updateDash({ sampleValidity: e.target.value })}
                    placeholder="95%"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Indeks Kepuasan / NIK</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dashConfig.indexScore}
                    onChange={e => updateDash({ indexScore: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Target Mutu 2026</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dashConfig.targetScore}
                    onChange={e => updateDash({ targetScore: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Calculated Fields */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                  Nilai Kalkulasi Otomatis
                  {dashConfig.useManualOverride && <Badge variant="outline" className="text-[10px] ml-1">Mode Manual Aktif</Badge>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Margin of Error</label>
                    {dashConfig.useManualOverride ? (
                      <Input
                        value={dashConfig.manualMarginOfError}
                        onChange={e => updateDash({ manualMarginOfError: e.target.value })}
                        placeholder="±5.00%"
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono text-foreground">
                        {derivedMarginOfError.label}
                      </div>
                    )}
                    {!dashConfig.useManualOverride && (
                      <p className="text-[10px] text-muted-foreground">Dihitung dari rumus Slovin: e = √((N/n − 1) / N)</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Gap</label>
                    {dashConfig.useManualOverride ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={dashConfig.manualGap}
                        onChange={e => updateDash({ manualGap: Number(e.target.value) })}
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono text-foreground">
                        {derivedGap}
                      </div>
                    )}
                    {!dashConfig.useManualOverride && (
                      <p className="text-[10px] text-muted-foreground">Target Mutu − Indeks Kepuasan</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Mutu</label>
                    {dashConfig.useManualOverride ? (
                      <Input
                        value={dashConfig.manualQualityLabel}
                        onChange={e => updateDash({ manualQualityLabel: e.target.value })}
                        placeholder="C"
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono text-foreground">
                        {derivedQuality.label}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Kategori Mutu</label>
                    {dashConfig.useManualOverride ? (
                      <Input
                        value={dashConfig.manualQualityCategory}
                        onChange={e => updateDash({ manualQualityCategory: e.target.value })}
                        placeholder="Kurang Baik"
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono text-foreground">
                        {derivedQuality.category}
                      </div>
                    )}
                    {!dashConfig.useManualOverride && (
                      <p className="text-[10px] text-muted-foreground">Dihitung otomatis dari Indeks Kepuasan</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Nilai Interval</label>
                    {dashConfig.useManualOverride ? (
                      <Input
                        value={dashConfig.manualQualityInterval}
                        onChange={e => updateDash({ manualQualityInterval: e.target.value })}
                        placeholder="65,00–76,60"
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono text-foreground">
                        {derivedQuality.interval}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Pratinjau Hasil Akhir</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Margin of Error", value: dashConfig.useManualOverride ? dashConfig.manualMarginOfError : derivedMarginOfError.label },
                    { label: "Tingkat Partisipasi", value: dashConfig.participationRate },
                    { label: "Index Reliability", value: String(dashConfig.reliabilityIndex) },
                    { label: "Trend Kepuasan", value: dashConfig.trend },
                    { label: "Total Responden", value: String(dashConfig.totalRespondents) },
                    { label: "Sampel Validitas", value: dashConfig.sampleValidity },
                    { label: "Indeks Kepuasan", value: dashConfig.indexScore.toFixed(2) },
                    { label: "Mutu", value: `${dashConfig.useManualOverride ? dashConfig.manualQualityLabel : derivedQuality.label} — ${dashConfig.useManualOverride ? dashConfig.manualQualityCategory : derivedQuality.category}` },
                    { label: "Nilai Interval", value: dashConfig.useManualOverride ? dashConfig.manualQualityInterval : derivedQuality.interval },
                    { label: "Target Mutu 2026", value: dashConfig.targetScore.toFixed(2) },
                    { label: "Gap", value: `${dashConfig.useManualOverride ? dashConfig.manualGap : derivedGap} poin` },
                  ].map(item => (
                    <div key={item.label} className="bg-card rounded-lg p-3 border border-border/50">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-sm font-black font-mono text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Pengguna</CardTitle>
              <CardDescription>Semua pengguna yang pernah masuk ke sistem SurveyDash.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === "SUPER_ADMIN" ? "default" : u.role === "ADMIN" ? "secondary" : "outline"}>
                        {u.role === "SUPER_ADMIN" ? <Shield className="w-3 h-3 mr-1" /> : null}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <span className="flex items-center text-emerald-600 text-xs font-bold gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="flex items-center text-destructive text-xs font-bold gap-1">
                          <X className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <select
                        className="text-[10px] font-black h-8 px-2 border rounded-xl bg-card dark:bg-slate-900 border-border shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50"
                        value={u.role}
                        disabled={role !== "SUPER_ADMIN" || !!isUpdatingUser || (u.role === "SUPER_ADMIN" && u.email === "gamingjre7@gmail.com")}
                        onChange={(e) => handlePromoteUser(u.id, e.target.value as any)}
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!surveyToDelete} onOpenChange={(open) => !open && setSurveyToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black">
              <Trash2 className="w-5 h-5" />
              KONFIRMASI HAPUS
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-gray-400">
              Hapus survei <span className="font-black text-foreground dark:text-white underline decoration-destructive/30">"{surveyToDelete?.name}"</span>?
              Tindakan ini tidak bisa dibatalkan secara manual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setSurveyToDelete(null)} disabled={isDeleting} className="rounded-xl">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteSurvey} disabled={isDeleting} className="rounded-xl font-black">
              {isDeleting ? "HAPUS..." : "YA, HAPUS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSurvey} onOpenChange={(open) => !open && setEditingSurvey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Survei</DialogTitle>
            <DialogDescription>Perbarui data survei yang sudah ada.</DialogDescription>
          </DialogHeader>
          {editingSurvey && (
            <form onSubmit={handleEditSurvey} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Survei</label>
                <Input placeholder="Contoh: SKM Layanan Kebencanaan" required value={editingSurvey.name} onChange={e => setEditingSurvey({ ...editingSurvey, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instansi / Unit Kerja</label>
                <Input placeholder="Nama Instansi / Unit Kerja" required value={editingSurvey.agency} onChange={e => setEditingSurvey({ ...editingSurvey, agency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Periode</label>
                <Input placeholder="Triwulan I 2026" required value={editingSurvey.period} onChange={e => setEditingSurvey({ ...editingSurvey, period: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL Script (Web App)</label>
                <Input placeholder="https://script.google.com/macros/s/.../exec" required value={editingSurvey.scriptUrl} onChange={e => setEditingSurvey({ ...editingSurvey, scriptUrl: e.target.value })} />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingSurvey(null)}>Batal</Button>
                <Button type="submit" disabled={isUpdatingSurvey}>
                  {isUpdatingSurvey ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
