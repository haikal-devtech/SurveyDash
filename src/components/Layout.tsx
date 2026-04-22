import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Settings, User as UserIcon, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      <header className="border-b border-border/40 glass h-16 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-xl font-black tracking-tight text-gradient flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Portal E-Survei
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <Link to="/dashboard" className="px-3 py-2 rounded-md hover:text-foreground hover:bg-accent transition-colors">
              Beranda
            </Link>
            {role === "SUPER_ADMIN" && (
              <Link to="/admin" className="px-3 py-2 rounded-md hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Manajemen
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-3 pr-2 sm:pr-4 border-r mr-1 sm:mr-2">
             <div className="text-right hidden lg:block">
               <p className="text-sm font-medium leading-none">{user?.email}</p>
               <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest">{role?.replace("_", " ")}</p>
             </div>
             <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border">
               <AvatarFallback className="bg-primary/10 text-primary uppercase text-xs font-bold">
                 {user?.email?.charAt(0)}
               </AvatarFallback>
             </Avatar>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="rounded-full">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/20 dark:bg-muted/5 pb-20">
        {children}
      </main>

      <footer className="border-t bg-card h-12 flex items-center justify-center px-6 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-medium">
        &copy; 2026 Portal Layanan & Kebijakan Digital &bull; Transparansi Data Publik
      </footer>
    </div>
  );
};
