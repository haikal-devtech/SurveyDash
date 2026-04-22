import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SurveyConfig } from "@/types";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  BarChart3, Clock, Calendar, ChevronRight, Search, PlusCircle, X, 
  CheckSquare, Square, BarChart2, TrendingUp, Users as UsersIcon, AlertCircle, RefreshCw, BriefcaseBusiness
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { SurveyData } from "@/types";


export const DashboardPage: React.FC = () => {
  const { user, role } = useAuth();
  const [surveys, setSurveys] = useState<SurveyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);


  useEffect(() => {
    const fetchSurveys = async () => {
      if (!user) return;
      
      try {
        let docsData: SurveyConfig[] = [];

        if (role === "SUPER_ADMIN") {
          const snap = await getDocs(query(collection(db, "surveys"), orderBy("createdAt", "desc")));
          docsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyConfig));
        } else {
          // Get mapped surveys
          const mappingSnap = await getDocs(query(collection(db, "userSurveys"), where("userId", "==", user.uid)));
          const surveyIds = mappingSnap.docs.map(doc => doc.data().surveyId);
          
          // Get PUBLIC surveys
          const publicSnap = await getDocs(query(collection(db, "surveys"), where("visibility", "==", "PUBLIC")));
          const publicData = publicSnap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyConfig));

          let mappedData: SurveyConfig[] = [];
          if (surveyIds.length > 0) {
            // Firestore 'in' limit is 10
            const q = query(collection(db, "surveys"), where("__name__", "in", surveyIds.slice(0, 10)));
            const mappedSnap = await getDocs(q);
            mappedData = mappedSnap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyConfig));
          }

          // Merge and unique
          const combined = [...publicData, ...mappedData];
          docsData = combined.filter((s, i, a) => a.findIndex(t => t.id === s.id) === i);
        }
        
        // Final client-side filter: if not Super Admin, hide LINK_ONLY unless specifically in mappedData
        // Actually, LINK_ONLY should only be accessible if you HAVE the ID.
        // If it's in mappedData, it means you were specifically given access.
        // If it's PUBLIC, everyone sees it.
        // So the logic above is correct.
        
        setSurveys(docsData);
      } catch (err) {
        console.error("Error fetching surveys:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [user, role]);

  const filteredSurveys = surveys.filter(s => {
    /* ... existing filter logic ... */
    const matchesSearch = (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (s.agency || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (s.createdAt) {
      const createdDate = s.createdAt.seconds 
        ? new Date(s.createdAt.seconds * 1000) 
        : (s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt));
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && createdDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && createdDate <= end;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert("Maksimal 3 survei untuk perbandingan.");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCompare = async () => {
    setIsComparing(true);
    try {
      const selectedSurveys = surveys.filter(s => selectedIds.includes(s.id));
      const fetchPromises = selectedSurveys.map(async (s) => {
        // Handle demo separately if needed
        const url = s.scriptUrl;
        if (url === "demo") {
           // Mock demo data quickly based on common structure
           return {
             id: s.id,
             name: s.name,
             ikm: 88.5,
             respondents: 120,
             grade: "A"
           };
        }
        try {
          const resp = await axios.get(`/api/survey-data?scriptUrl=${encodeURIComponent(url)}`);
          return {
            id: s.id,
            name: s.name,
            ikm: resp.data.ikm.score,
            respondents: resp.data.meta.total_respondents,
            grade: resp.data.ikm.category
          };
        } catch {
          return { id: s.id, name: s.name, error: true };
        }
      });

      const results = await Promise.all(fetchPromises);
      setComparisonData(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsComparing(false);
    }
  };


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1 rounded-full">
            Katalog Survei 2026
          </Badge>
          <h2 className="text-5xl font-black tracking-tighter text-gradient uppercase">Pusat Data Publik</h2>
          <p className="text-muted-foreground font-medium text-lg">Visualisasi hasil survei instansi secara real-time dan transparan.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/survey/demo">
             <Button variant="outline" className="gap-2 h-14 px-6 rounded-2xl glass border-white/20 hover:scale-105 transition-all font-bold">
               <BarChart3 className="w-5 h-5 text-primary" />
               Lihat Demo
             </Button>
          </Link>
          {role === "SUPER_ADMIN" && (
            <Link to="/admin">
              <Button className="gap-2 h-14 px-8 rounded-2xl bg-gradient-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all font-black uppercase text-xs tracking-widest">
                <PlusCircle className="w-5 h-5" />
                Tambah Survei
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-white/5 dark:bg-slate-900/20 p-6 rounded-[2rem] backdrop-blur-sm border border-white/10">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cari survei atau instansi..." 
            className="pl-12 h-14 bg-white/50 dark:bg-slate-950/50 border-none rounded-2xl shadow-inner text-base font-medium focus-visible:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-muted/40 p-1 px-2 rounded-xl border border-border/50 transition-all hover:border-primary/30">
             <div className="flex items-center gap-1.5 pr-2 border-r border-border/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
               <Calendar className="w-3 h-3" />
               <span className="hidden sm:inline">Dibuat</span>
             </div>
             <div className="flex items-center">
               <Input 
                 type="date" 
                 className="h-8 text-[10px] w-[110px] border-none bg-transparent focus-visible:ring-0 shadow-none px-2 font-bold cursor-pointer"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
               />
               <span className="text-muted-foreground text-[10px] px-1 font-black">-</span>
               <Input 
                 type="date" 
                 className="h-8 text-[10px] w-[110px] border-none bg-transparent focus-visible:ring-0 shadow-none px-2 font-bold cursor-pointer"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
               />
               {(startDate || endDate) && (
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-6 w-6 ml-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                   onClick={() => { setStartDate(""); setEndDate(""); }}
                 >
                   <X className="w-3 h-3" />
                 </Button>
               )}
             </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredSurveys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSurveys.map(survey => (
            <Card key={survey.id} className={`group glass-card cursor-pointer relative overflow-hidden flex flex-col rounded-[2rem] border-none ${selectedIds.includes(survey.id) ? 'ring-2 ring-primary bg-primary/5 shadow-2xl shadow-primary/20' : 'shadow-xl'}`}>
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none duration-700">
                <BarChart3 className="w-48 h-48 transform translate-x-12 -translate-y-12 text-primary" />
              </div>
              
              <div className="absolute top-4 left-4 z-20" onClick={(e) => handleToggleSelect(survey.id, e)}>
                <div className={`p-2 rounded-xl backdrop-blur-md transition-all duration-300 ${selectedIds.includes(survey.id) ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-white/50 dark:bg-black/50 text-muted-foreground hover:bg-white/80 dark:hover:bg-black/80'}`}>
                  {selectedIds.includes(survey.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
              </div>

              {!survey.isActive && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 font-black uppercase text-[10px]">Draft</Badge>
                </div>
              )}

              <CardHeader className="pt-16">
                <div className="space-y-2">
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black tracking-widest px-2 py-0.5 w-fit">
                    {survey.period}
                  </Badge>
                  <CardTitle className="text-2xl font-black leading-tight group-hover:text-primary transition-colors line-clamp-2">{survey.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2 font-bold text-muted-foreground/80 mt-2">
                  <div className="p-1 rounded-md bg-muted/50">
                    <BriefcaseBusiness className="w-3.5 h-3.5" />
                  </div>
                  {survey.agency}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pt-4">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                   <div className="space-y-1">
                     <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Responden</p>
                     <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs font-black">LIVE DATA</p>
                     </div>
                   </div>
                   <div className="space-y-1 text-right">
                     <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Sinkronisasi</p>
                     <div className="flex items-center justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-black">
                          {survey.lastFetched ? new Date(survey.lastFetched).toLocaleDateString("id-ID") : "Baru"}
                        </p>
                     </div>
                   </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Link to={`/survey/${survey.id}`} className="w-full relative z-10">
                  <Button className="w-full h-12 justify-between rounded-xl bg-slate-900 dark:bg-white dark:text-slate-950 hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all shadow-lg group/btn">
                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">Buka Dashboard</span>
                    <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
          <p className="text-lg font-medium text-muted-foreground">Tidak ada survei ditemukan.</p>
          {role === "SUPER_ADMIN" && (
             <Link to="/admin" className="text-primary hover:underline mt-2 block">Daftarkan survei baru sekarang</Link>
          )}
        </div>
      )}

      {/* Comparison Floating Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-3xl glass dark:bg-slate-900/80 text-foreground rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 border-primary/20"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-lg shadow-primary/30">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Bandingkan Survei</p>
                <div className="flex gap-1 mt-1">
                   {selectedIds.map(id => {
                     const s = surveys.find(surv => surv.id === id);
                     return (
                       <Badge key={id} variant="secondary" className="bg-primary/10 hover:bg-primary/20 border-primary/20 text-foreground text-[10px] pr-1 transition-colors">
                         {s?.name.substring(0, 15)}...
                         <X className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" onClick={(e) => handleToggleSelect(id, e as any)} />
                       </Badge>
                     );
                   })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <Button variant="ghost" onClick={() => setSelectedIds([])} className="hover:bg-destructive/10 hover:text-destructive text-xs transition-colors">
                 Reset
               </Button>
               <Dialog>
                 <DialogTrigger asChild>
                    <Button onClick={handleCompare} className="font-black text-xs px-8 rounded-xl h-12 shadow-lg shadow-primary/20 bg-gradient-primary text-white hover:opacity-90 transition-opacity">
                      BANDINGKAN SEKARANG
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass">
                   <DialogHeader>
                     <DialogTitle>Perbandingan Metrik Utama</DialogTitle>
                     <DialogDescription>Membandingkan performa antara {selectedIds.length} survei terpilih.</DialogDescription>
                   </DialogHeader>
                   
                   {isComparing ? (
                     <div className="py-20 flex flex-col items-center gap-4">
                        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse font-bold">Menganalisis data...</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 font-sans">
                        {comparisonData.map(data => (
                          <Card key={data.id} className="relative overflow-hidden border-2 border-muted/50">
                            {data.error ? (
                              <CardContent className="p-10 text-center space-y-2">
                                <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                                <p className="text-xs font-bold text-destructive">Gagal Memuat Data</p>
                                <p className="text-[10px] text-muted-foreground">{data.name}</p>
                              </CardContent>
                            ) : (
                              <>
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${data.ikm >= 88 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-black leading-tight h-10 overflow-hidden line-clamp-2">
                                    {data.name}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-2">
                                  <div className="text-center p-4 bg-muted/40 rounded-2xl">
                                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-2">Skor IKM</p>
                                     <p className={`text-4xl font-black ${data.ikm >= 81 ? 'text-emerald-600' : 'text-blue-600'}`}>{data.ikm.toFixed(2)}</p>
                                     <Badge className="mt-2 bg-slate-900 border-none capitalize">{data.grade}</Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-3">
                                     <div className="flex items-center justify-between p-3 border rounded-xl">
                                        <div className="flex items-center gap-2">
                                          <UsersIcon className="w-4 h-4 text-primary" />
                                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Responden</span>
                                        </div>
                                        <span className="text-sm font-black">{data.respondents}</span>
                                     </div>
                                     <div className="flex items-center justify-between p-3 border rounded-xl">
                                        <div className="flex items-center gap-2">
                                          <TrendingUp className="w-4 h-4 text-primary" />
                                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Status</span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-black py-0">STABIL</Badge>
                                     </div>
                                  </div>
                                </CardContent>
                              </>
                            )}
                          </Card>
                        ))}
                     </div>
                   )}
                 </DialogContent>
               </Dialog>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

