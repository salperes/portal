import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import AnnouncementDetail from './pages/AnnouncementDetail';
import Applications from './pages/Applications';
import AnnouncementsAdmin from './pages/admin/AnnouncementsAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';
import GroupsAdmin from './pages/admin/GroupsAdmin';
import ProjectsAdmin from './pages/admin/ProjectsAdmin';
import FileServer from './pages/FileServer';
import Documents from './pages/Documents';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="announcements/:id" element={<AnnouncementDetail />} />
            <Route path="documents" element={<Documents />} />
            <Route path="applications" element={<Applications />} />
            <Route path="file-server" element={<FileServer />} />
            <Route path="settings" element={<Settings />} />

            {/* Admin Routes */}
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <UsersAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="admin/announcements"
              element={
                <AdminRoute>
                  <AnnouncementsAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="admin/groups"
              element={
                <AdminRoute>
                  <GroupsAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="admin/projects"
              element={
                <AdminRoute>
                  <ProjectsAdmin />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
