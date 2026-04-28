import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SurveyDetailPage } from "@/pages/SurveyDetailPage";
import { AdminPage } from "@/pages/AdminPage";
import { PresentationPage } from "@/pages/PresentationPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && role !== "SUPER_ADMIN") return <Navigate to="/dashboard" />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="survey-dash-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/survey/:id" element={
            <ProtectedRoute>
              <SurveyDetailPage />
            </ProtectedRoute>
          } />

          <Route path="/survey/:id/presentation" element={
            <PresentationPage />
          } />

          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
