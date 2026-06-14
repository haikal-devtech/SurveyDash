import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SurveyConfig, UserProfile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit3, Shield, User as UserIcon, Check, X, Users, Globe, RotateCcw, Save, Info, BarChart2 } from "lucide-react";
import {
  SurveyDashboardConfig,
  getSurveyDashboardConfig,
  saveSurveyDashboardConfig,
  resetSurveyDashboardConfig,
  calculateSlovinMarginError,
  calculateGap,
  getQualityByScore,
  resolveSurveyDashboard,
} from "@/lib/survey-dashboard-config";

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

  // Per-survey dashboard config state (loaded when edit modal opens)
  const [editingDashConfig, setEditingDashConfig] = useState<SurveyDashboardConfig | null>(null);
  const [dashSaveStatus, setDashSaveStatus] = useState<"idle" | "saved" | "reset">("idle");

  const openEditSurvey = (s: SurveyConfig) => {
    setEditingSurvey(s);
    setEditingDashConfig(getSurveyDashboardConfig(s.id));
    setDashSaveStatus("idle");
  };

  const closeEditSurvey = () => {
    setEditingSurvey(null);
    setEditingDashConfig(null);
    setDashSaveStatus("idle");
  };

  const updateDash = (patch: Partial<SurveyDashboardConfig>) =>
    setEditingDashConfig(prev => prev ? { ...prev, ...patch } : prev);

  const handleDashSave = () => {
    if (!editingSurvey || !editingDashConfig) return;
    saveSurveyDashboardConfig(editingSurvey.id, editingDashConfig);
    setDashSaveStatus("saved");
    setTimeout(() => setDashSaveStatus("idle"), 2500);
  };

  const handleDashReset = () => {
    if (!editingSurvey) return;
    const defaultCfg = resetSurveyDashboardConfig(editingSurvey.id);
    setEditingDashConfig(defaultCfg);
    setDashSaveStatus("reset");
    setTimeout(() => setDashSaveStatus("idle"), 2500);
  };

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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => openEditSurvey(s)}>
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

      <Dialog open={!!editingSurvey} onOpenChange={(open) => !open && closeEditSurvey()}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              Edit Survei
            </DialogTitle>
            <DialogDescription>
              {editingSurvey?.name}
            </DialogDescription>
          </DialogHeader>

          {editingSurvey && editingDashConfig && (() => {
            const dc = editingDashConfig;
            const derivedMoE = dc.marginErrorMode === "slovin"
              ? calculateSlovinMarginError(dc.population, dc.totalRespondents).label
              : dc.manualMarginOfError;
            const derivedIdx = dc.indexScoreMode === "manual" ? dc.manualIndexScore : 0;
            const derivedGap = dc.gapMode === "auto" ? calculateGap(dc.targetScore, derivedIdx) : dc.manualGap;
            const derivedQuality = dc.qualityMode === "auto" ? getQualityByScore(derivedIdx) : { label: dc.manualQualityLabel, category: dc.manualQualityCategory, interval: dc.manualQualityInterval };
            const resolved = resolveSurveyDashboard(dc);

            return (
              <Tabs defaultValue="info" className="flex flex-col flex-1">
                <div className="px-6 pt-4">
                  <TabsList className="bg-muted p-1 w-full sm:w-auto">
                    <TabsTrigger value="info" className="gap-2 text-xs">
                      <Globe className="w-3.5 h-3.5" />
                      Info Survei
                    </TabsTrigger>
                    <TabsTrigger value="dashboard" className="gap-2 text-xs">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Ringkasan & Rumus
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="max-h-[70vh]">
                  {/* ── Tab 1: Info Survei ── */}
                  <TabsContent value="info" className="px-6 py-4 mt-0">
                    <form id="edit-survey-form" onSubmit={handleEditSurvey} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nama Survei</label>
                        <Input required value={editingSurvey.name} onChange={e => setEditingSurvey({ ...editingSurvey, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Instansi / Unit Kerja</label>
                        <Input required value={editingSurvey.agency} onChange={e => setEditingSurvey({ ...editingSurvey, agency: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Periode</label>
                        <Input required value={editingSurvey.period} onChange={e => setEditingSurvey({ ...editingSurvey, period: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">URL Script (Web App)</label>
                        <Input required value={editingSurvey.scriptUrl} onChange={e => setEditingSurvey({ ...editingSurvey, scriptUrl: e.target.value })} />
                      </div>
                    </form>
                  </TabsContent>

                  {/* ── Tab 2: Ringkasan & Rumus Dashboard ── */}
                  <TabsContent value="dashboard" className="px-6 py-4 mt-0 space-y-6">

                    {/* Section: Identitas */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identitas Dashboard</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Judul Survei</label>
                          <Input value={dc.title} onChange={e => updateDash({ title: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Instansi</label>
                          <Input value={dc.institution} onChange={e => updateDash({ institution: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Periode</label>
                          <Input value={dc.period} onChange={e => updateDash({ period: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    {/* Section: Sampel */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Sampel</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Populasi (N)</label>
                          <Input type="number" value={dc.population} onChange={e => updateDash({ population: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Total Responden (n)</label>
                          <Input type="number" value={dc.totalRespondents} onChange={e => updateDash({ totalRespondents: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Confidence Level (%)</label>
                          <Input type="number" value={dc.confidenceLevel} onChange={e => updateDash({ confidenceLevel: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Tingkat Partisipasi</label>
                          <Input value={dc.participationRate} onChange={e => updateDash({ participationRate: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Index Reliability</label>
                          <Input type="number" step="0.01" value={dc.reliabilityIndex} onChange={e => updateDash({ reliabilityIndex: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Trend Kepuasan</label>
                          <Input value={dc.trend} onChange={e => updateDash({ trend: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Sampel Validitas</label>
                          <Input value={dc.sampleValidity} onChange={e => updateDash({ sampleValidity: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    {/* Section: Margin of Error */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margin of Error</p>
                      <div className="flex items-center gap-3">
                        {(["slovin", "manual"] as const).map(mode => (
                          <button key={mode} type="button"
                            onClick={() => updateDash({ marginErrorMode: mode })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${dc.marginErrorMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            {mode === "slovin" ? "Rumus Slovin" : "Manual"}
                          </button>
                        ))}
                      </div>
                      {dc.marginErrorMode === "slovin" ? (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 flex-1 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono">
                            {derivedMoE}
                          </div>
                          <p className="text-[10px] text-muted-foreground">e = √((N/n − 1) / N)</p>
                        </div>
                      ) : (
                        <Input value={dc.manualMarginOfError} onChange={e => updateDash({ manualMarginOfError: e.target.value })} placeholder="±5.00%" />
                      )}
                    </div>

                    {/* Section: Indeks Kepuasan */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Indeks Kepuasan / NIK</p>
                      <div className="flex items-center gap-3">
                        {(["auto", "manual"] as const).map(mode => (
                          <button key={mode} type="button"
                            onClick={() => updateDash({ indexScoreMode: mode })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${dc.indexScoreMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            {mode === "auto" ? "Otomatis dari Data" : "Manual"}
                          </button>
                        ))}
                      </div>
                      {dc.indexScoreMode === "manual" ? (
                        <Input type="number" step="0.01" value={dc.manualIndexScore} onChange={e => updateDash({ manualIndexScore: Number(e.target.value) })} />
                      ) : (
                        <div className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono text-muted-foreground">
                          Dihitung otomatis dari rata-rata indikator survei
                        </div>
                      )}
                    </div>

                    {/* Section: Target & Gap */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Mutu & Gap</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Target Mutu</label>
                          <Input type="number" step="0.01" value={dc.targetScore} onChange={e => updateDash({ targetScore: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Mode Gap</label>
                          <div className="flex items-center gap-2 h-9">
                            {(["auto", "manual"] as const).map(mode => (
                              <button key={mode} type="button"
                                onClick={() => updateDash({ gapMode: mode })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${dc.gapMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                                {mode === "auto" ? "Otomatis" : "Manual"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Gap</label>
                          {dc.gapMode === "auto" ? (
                            <div className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono">
                              {derivedGap}
                            </div>
                          ) : (
                            <Input type="number" step="0.01" value={dc.manualGap} onChange={e => updateDash({ manualGap: Number(e.target.value) })} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section: Mutu */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mutu & Kategori</p>
                      <div className="flex items-center gap-3">
                        {(["auto", "manual"] as const).map(mode => (
                          <button key={mode} type="button"
                            onClick={() => updateDash({ qualityMode: mode })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${dc.qualityMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            {mode === "auto" ? "Otomatis" : "Manual"}
                          </button>
                        ))}
                      </div>
                      {dc.qualityMode === "auto" ? (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Mutu", value: derivedQuality.label },
                            { label: "Kategori", value: derivedQuality.category },
                            { label: "Nilai Interval", value: derivedQuality.interval },
                          ].map(f => (
                            <div key={f.label} className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-mono">
                              {f.value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Label Mutu</label>
                            <Input value={dc.manualQualityLabel} onChange={e => updateDash({ manualQualityLabel: e.target.value })} placeholder="A" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Kategori Mutu</label>
                            <Input value={dc.manualQualityCategory} onChange={e => updateDash({ manualQualityCategory: e.target.value })} placeholder="Sangat Baik" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Nilai Interval</label>
                            <Input value={dc.manualQualityInterval} onChange={e => updateDash({ manualQualityInterval: e.target.value })} placeholder="88,31–100" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Live Preview */}
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-3 h-3" /> Pratinjau Hasil Akhir
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "Margin of Error", value: resolved.marginOfError },
                          { label: "Total Responden", value: String(resolved.totalRespondents) },
                          { label: "Indeks Kepuasan", value: resolved.indexScore.toFixed(2) },
                          { label: "Mutu", value: `${resolved.qualityLabel} — ${resolved.qualityCategory}` },
                          { label: "Nilai Interval", value: resolved.qualityInterval },
                          { label: "Target Mutu", value: resolved.targetScore.toFixed(2) },
                          { label: "Gap", value: `${resolved.gap} poin` },
                          { label: "Partisipasi", value: resolved.participationRate },
                        ].map(item => (
                          <div key={item.label} className="bg-card rounded-lg p-2.5 border border-border/50">
                            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">{item.label}</p>
                            <p className="text-xs font-black font-mono text-foreground truncate">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Save/Reset for dashboard config */}
                    <div className="flex items-center gap-2 justify-end pb-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleDashReset}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Config Survey Ini
                      </Button>
                      <Button type="button" size="sm" className="gap-1.5" onClick={handleDashSave}>
                        <Save className="w-3.5 h-3.5" />
                        {dashSaveStatus === "saved" ? "Tersimpan!" : dashSaveStatus === "reset" ? "Direset!" : "Simpan Config"}
                      </Button>
                    </div>
                  </TabsContent>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={closeEditSurvey}>Batal</Button>
                  <Button type="submit" form="edit-survey-form" disabled={isUpdatingSurvey}>
                    {isUpdatingSurvey ? "Menyimpan..." : "Simpan Info Survei"}
                  </Button>
                </DialogFooter>
              </Tabs>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
