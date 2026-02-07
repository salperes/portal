/**
 * Web Shell - App Component
 *
 * Bu dosya apps/web aktif olduğunda kullanılacak.
 * Şu anda frontend/src/App.tsx aktif uygulama olarak çalışıyor.
 *
 * Aktivasyon için:
 * 1. Frontend'deki sayfaları packages/modules/'a taşı
 * 2. Aşağıdaki lazy import'ları aç
 * 3. Docker config'i güncelle
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { PageLoading } from '@portal/ui';

// ============================================
// REFERANS: frontend/src/App.tsx yapısı
// ============================================
//
// Lazy loaded modules (modüller ayrıldığında):
// const Dashboard = lazy(() => import('@portal/modules-dashboard/pages/Dashboard'));
// const Announcements = lazy(() => import('@portal/modules-announcements/pages/Announcements'));
// const AnnouncementDetail = lazy(() => import('@portal/modules-announcements/pages/AnnouncementDetail'));
// const FileServer = lazy(() => import('@portal/modules-file-server/pages/FileServer'));
// const UsersAdmin = lazy(() => import('@portal/modules-users/pages/UsersAdmin'));
// const AnnouncementsAdmin = lazy(() => import('@portal/modules-announcements/pages/AnnouncementsAdmin'));

// Placeholder components
const Dashboard = () => <div className="p-6">Dashboard - apps/web shell</div>;
const NotFound = () => <div className="p-6">404 - Sayfa bulunamadı</div>;

// Loading fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<div>Login Page</div>} />

          {/* Protected - with Layout */}
          <Route path="/" element={<Dashboard />} />

          {/* Module routes - lazy loaded when extracted */}
          {/* <Route path="/announcements" element={<Announcements />} /> */}
          {/* <Route path="/announcements/:id" element={<AnnouncementDetail />} /> */}
          {/* <Route path="/file-server" element={<FileServer />} /> */}
          {/* <Route path="/admin/users" element={<UsersAdmin />} /> */}
          {/* <Route path="/admin/announcements" element={<AnnouncementsAdmin />} /> */}

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

/**
 * Mevcut Aktif Yapı:
 * - Frontend: frontend/src/App.tsx
 * - Çalıştırma: cd testenv && docker-compose up -d portal-test-frontend
 *
 * Route Listesi (frontend/'de):
 * - / → Dashboard
 * - /login → Login
 * - /announcements → Announcements list
 * - /announcements/:id → Announcement detail
 * - /file-server → File browser
 * - /admin/users → User management (admin)
 * - /admin/announcements → Announcement management (admin)
 */

export default App;
