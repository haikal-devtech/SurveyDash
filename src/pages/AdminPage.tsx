import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SurveyConfig, UserProfile, SamplingConfig, SurveyType } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit3, Shield, User as UserIcon, Check, X, Users, Settings2, Globe, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_SAMPLING: SamplingConfig = {
  confidenceLevel: 95,
  populationSize: 0,
  marginOfError: 0.05,
  targetRespondents: 0,
  samplingMethod: "Accidental Sampling",
};

function calcSlovin(N: number, e: number): number {
  if (N <= 0 || e <= 0) return 0;
  return Math.round(N / (1 + N * e * e));
}

function SamplingForm({
  value,
  onChange,
}: {
  value: SamplingConfig;
  onChange: (v: SamplingConfig) => void;
}) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<SamplingConfig>) => {
    const next = { ...value, ...patch };
    // Auto-calculate n via Slovin whenever N or e changes
    next.targetRespondents = calcSlovin(next.populationSize, next.marginOfError);
    onChange(next);
  };

  return (
    <div className="border border-dashed border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <span>Konfigurasi Sampling & Margin of Error</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3 bg-muted/10">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tingkat Kepercayaan (%)</label>
              <Input
                type="number"
                min={80} max={99} step={1}
                value={value.confidenceLevel}
                onChange={e => update({ confidenceLevel: Number(e.target.value) })}
                placeholder="95"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Margin of Error (%)</label>
              <Input
                type="number"
                min={0.1} max={50} step={0.01}
                value={parseFloat((value.marginOfError * 100).toFixed(4))}
                onChange={e => update({ marginOfError: Number(e.target.value) / 100 })}
                placeholder="2.21"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ukuran Populasi (N)</label>
            <Input
              type="number"
              min={0}
              value={value.populationSize || ""}
              onChange={e => update({ populationSize: Number(e.target.value) })}
              placeholder="Jumlah populasi, mis. 289716110"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Metode Sampling</label>
            <Input
              value={value.samplingMethod}
              onChange={e => update({ samplingMethod: e.target.value })}
              placeholder="Accidental Sampling"
            />
          </div>
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
            <span className="text-xs font-bold text-muted-foreground">Target Responden (Slovin)</span>
            <span className="text-lg font-black text-primary">
              n = {value.targetRespondents > 0 ? value.targetRespondents.toLocaleString("id-ID") : "—"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Rumus Slovin: n = N / (1 + N × e²) &nbsp;|&nbsp; e = {(value.marginOfError * 100).toFixed(2)}% → {value.marginOfError.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}

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
    visibility: "PRIVATE" as const,
    surveyType: "SKM" as SurveyType,
  });
  const [newSampling, setNewSampling] = useState<SamplingConfig>(DEFAULT_SAMPLING);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState<string | null>(null);
  const [surveyToDelete, setSurveyToDelete] = useState<SurveyConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyConfig | null>(null);
  const [isUpdatingSurvey, setIsUpdatingSurvey] = useState(false);

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
        surveyType: newSurvey.surveyType || "SKM",
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        lastFetched: null,
        samplingConfig: newSampling,
      };
      const docRef = await addDoc(collection(db, "surveys"), surveyStore);
      setSurveys([...surveys, { id: docRef.id, ...surveyStore, createdAt: new Date() } as SurveyConfig]);
      setNewSurvey({ name: "", agency: "Sekretariat Daerah", period: "Triwulan I 2026", scriptUrl: "", visibility: "PRIVATE", surveyType: "SKM" });
      setNewSampling(DEFAULT_SAMPLING);
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
        visibility: editingSurvey.visibility,
        surveyType: editingSurvey.surveyType ?? "SKM",
        samplingConfig: editingSurvey.samplingConfig ?? DEFAULT_SAMPLING,
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipe Survei</label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      value={newSurvey.surveyType}
                      onChange={e => setNewSurvey({ ...newSurvey, surveyType: e.target.value as SurveyType })}
                    >
                      <option value="SKM">SKM — Survei Kepuasan Masyarakat (IKM)</option>
                      <option value="ELECTORAL">ELECTORAL — Survei Elektoral & Kepemimpinan</option>
                    </select>
                  </div>
                  <SamplingForm value={newSampling} onChange={setNewSampling} />
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
                  <TableHead>Tipe</TableHead>
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
                      {(s.surveyType ?? "SKM") === "ELECTORAL" ? (
                        <Badge variant="outline" className="text-violet-600 border-violet-200 dark:text-violet-400 uppercase text-[10px] font-black">Electoral</Badge>
                      ) : (
                        <Badge variant="outline" className="text-teal-600 border-teal-200 dark:text-teal-400 uppercase text-[10px] font-black">SKM</Badge>
                      )}
                    </TableCell>
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
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipe Survei</label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={editingSurvey.surveyType ?? "SKM"}
                  onChange={e => setEditingSurvey({ ...editingSurvey, surveyType: e.target.value as SurveyType })}
                >
                  <option value="SKM">SKM — Survei Kepuasan Masyarakat (IKM)</option>
                  <option value="ELECTORAL">ELECTORAL — Survei Elektoral & Kepemimpinan</option>
                </select>
              </div>
              <SamplingForm
                value={editingSurvey.samplingConfig ?? DEFAULT_SAMPLING}
                onChange={sc => setEditingSurvey({ ...editingSurvey, samplingConfig: sc })}
              />
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
