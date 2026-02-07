import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Bell,
  FileText,
  Grid3X3,
  LogOut,
  Menu,
  Settings,
  Search,
  HelpCircle,
  Cog,
  Sun,
  Moon,
  Users,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const navItems = [
  { path: '/', icon: Home, label: 'Ana Sayfa' },
  { path: '/announcements', icon: Bell, label: 'Duyurular' },
  { path: '/documents', icon: FileText, label: 'Dökümanlar' },
  { path: '/applications', icon: Grid3X3, label: 'Uygulamalar' },
];

const adminNavItems = [
  { path: '/admin/users', icon: Users, label: 'Kullanıcı Yönetimi' },
  { path: '/admin/announcements', icon: Bell, label: 'Duyuru Yönetimi' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-gray-900">
      {/* Dark Navy Top Bar */}
      <header className="h-12 bg-[#001529] flex items-center px-2 fixed top-0 left-0 right-0 z-50">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden w-12 h-12 flex items-center justify-center hover:bg-white/10 transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        {/* Site Title */}
        <Link to="/" className="flex items-center gap-2 px-3 text-white font-semibold text-sm hover:bg-white/10 h-12">
          <img src="/mss-eye.png" alt="MSS" className="w-6 h-6 object-contain" />
          MSS Portal
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Box */}
        <div className="hidden md:flex items-center bg-white/10 rounded-lg px-3 py-1.5 mx-4 w-80 border border-white/20">
          <Search className="w-4 h-4 text-white/70" />
          <input
            type="text"
            placeholder="Ara..."
            className="bg-transparent border-0 text-white placeholder-white/50 text-sm ml-2 w-full focus:outline-none"
          />
        </div>

        {/* Right Side Icons */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
            title={theme === 'light' ? 'Koyu tema' : 'Açık tema'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-white/80" />
            ) : (
              <Sun className="w-5 h-5 text-white/80" />
            )}
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
            <Cog className="w-5 h-5 text-white/80" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-white/80" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5 text-white/80" />
          </button>

          {/* User Avatar */}
          <div className="relative ml-2" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-sm font-medium">
                {getInitials(user?.displayName)}
              </div>
              <span className="hidden lg:block text-white/90 text-sm max-w-[120px] truncate">
                {user?.displayName?.split(' ')[0]}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && (
              <div className="absolute top-12 right-0 w-72 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-lg font-medium">
                      {getInitials(user?.displayName)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{user?.displayName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3">
                    <Settings className="w-4 h-4 text-gray-400" />
                    Hesap ayarları
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Oturumu kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Dark Navy Left Navigation */}
      <aside
        className={`fixed top-12 left-0 z-40 h-[calc(100vh-48px)] w-64 bg-[#001529] transform transition-transform duration-200 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User Profile Section */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-sm font-medium">
              {getInitials(user?.displayName)}
            </div>
            <div>
              <p className="font-medium text-white text-sm">{user?.displayName}</p>
              <p className="text-xs text-gray-400">{user?.department || 'Kullanıcı'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Menü</span>
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg ${
                  isActive
                    ? 'bg-[#1890FF] text-white'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Admin Section */}
          {user?.isAdmin && (
            <>
              <div className="px-4 py-3 mt-4">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Yönetim
                </span>
              </div>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg ${
                      isActive
                        ? 'bg-[#1890FF] text-white'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 w-full px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 pt-12">
        {/* Page Content */}
        <main className="p-6 min-h-[calc(100vh-48px)] bg-[#F0F2F5] dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
