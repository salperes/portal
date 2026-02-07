import { useState, useRef } from 'react';
import {
  Bell,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  Clock,
  Eye,
  ClipboardList,
  BarChart3,
  Headphones,
  Users,
  BookOpen,
  Shield,
  Book,
  Code,
  GripVertical,
  Server,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { announcementsApi } from '../services/announcements';
import { integrationsApi } from '../services/integrations';
import type { AnnouncementPriority } from '../types';

interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  type: 'sso' | 'link' | 'internal';
  url?: string;
}

const defaultApps: AppItem[] = [
  { id: 'rms', name: 'RMS', description: 'Requirements Management System', icon: ClipboardList, iconColor: 'text-[#0078d4]', type: 'sso' },
  { id: 'file-server', name: 'Dosya Sunucusu', description: 'Kurumsal Dosya Paylaşımı', icon: Server, iconColor: 'text-cyan-600', type: 'internal', url: '/file-server' },
  { id: 'erp', name: 'ERP', description: 'Kurumsal Kaynak Planlama', icon: BarChart3, iconColor: 'text-emerald-600', type: 'link', url: 'https://msspektral.odoo.com/odoo' },
  { id: 'helpdesk', name: 'Helpdesk', description: 'IT Destek Sistemi', icon: Headphones, iconColor: 'text-purple-600', type: 'link', url: '#' },
  { id: 'hr', name: 'HR Portal', description: 'İnsan Kaynakları', icon: Users, iconColor: 'text-amber-600', type: 'link', url: 'https://app.inoportal.com' },
];

interface DocItem {
  id: number;
  title: string;
  type: string;
  date: string;
  icon: LucideIcon;
  iconColor: string;
}

const recentDocs: DocItem[] = [
  { id: 1, title: 'Oryantasyon Rehberi', type: 'DOCX', date: '2 gün önce', icon: BookOpen, iconColor: 'text-blue-600' },
  { id: 2, title: 'IT Güvenlik Politikası', type: 'PDF', date: '1 hafta önce', icon: Shield, iconColor: 'text-red-600' },
  { id: 3, title: 'Şirket El Kitabı', type: 'PDF', date: '2 hafta önce', icon: Book, iconColor: 'text-orange-600' },
  { id: 4, title: 'Yazılım Geliştirme Standartları', type: 'DOCX', date: '3 hafta önce', icon: Code, iconColor: 'text-cyan-600' },
];

const priorityConfig: Record<AnnouncementPriority, { border: string; bg: string; text: string; label: string }> = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Kritik' },
  important: { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Önemli' },
  info: { border: 'border-l-[#0078d4]', bg: 'bg-blue-50', text: 'text-[#0078d4]', label: 'Bilgi' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// localStorage'dan uygulama sırasını yükle
function loadAppOrder(): AppItem[] {
  try {
    const savedOrder = localStorage.getItem('dashboard-app-order');
    if (savedOrder) {
      const orderIds = JSON.parse(savedOrder) as string[];
      // Kaydedilmiş sıraya göre uygulamaları düzenle
      const orderedApps: AppItem[] = [];
      for (const id of orderIds) {
        const app = defaultApps.find(a => a.id === id);
        if (app) orderedApps.push(app);
      }
      // Yeni eklenen uygulamaları sona ekle
      for (const app of defaultApps) {
        if (!orderedApps.find(a => a.id === app.id)) {
          orderedApps.push(app);
        }
      }
      return orderedApps;
    }
  } catch {
    // localStorage hatası durumunda varsayılanı kullan
  }
  return defaultApps;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);
  const [apps, setApps] = useState<AppItem[]>(loadAppOrder);
  const [draggedApp, setDraggedApp] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const { data: announcements, isLoading: announcementsLoading, error: announcementsError } = useQuery({
    queryKey: ['announcements-latest'],
    queryFn: () => announcementsApi.getLatest(5),
  });

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    setDraggedApp(appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedApp === targetId) {
      setDropTarget(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const position = e.clientX < midX ? 'before' : 'after';

    setDropTarget({ id: targetId, position });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedApp || !dropTarget) return;

    const draggedIndex = apps.findIndex(app => app.id === draggedApp);
    const targetIndex = apps.findIndex(app => app.id === dropTarget.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newApps = [...apps];
    const [removed] = newApps.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (dropTarget.position === 'after') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    newApps.splice(insertIndex, 0, removed);
    setApps(newApps);

    // Sıralamayı localStorage'a kaydet
    localStorage.setItem('dashboard-app-order', JSON.stringify(newApps.map(a => a.id)));

    setDraggedApp(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
    setDropTarget(null);
  };

  const handleAppLaunch = async (app: AppItem) => {
    if (app.type === 'internal' && app.url) {
      navigate(app.url);
      return;
    }

    if (app.type === 'link' && app.url) {
      window.open(app.url, '_blank');
      return;
    }

    if (app.type === 'sso') {
      setLaunchingApp(app.id);
      try {
        if (app.id === 'rms') {
          await integrationsApi.launchRMS();
        }
      } catch (error) {
        console.error('App launch failed:', error);
        alert('Uygulama başlatılamadı. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLaunchingApp(null);
      }
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const getFirstName = (displayName: string | undefined) => {
    if (!displayName) return 'Kullanıcı';
    const parts = displayName.split(' ');
    // İlk kelime kısaltma ise (örn: "S." veya tek harf) sonraki kelimeyi kullan
    if (parts[0].endsWith('.') || parts[0].length === 1) {
      return parts[1] || parts[0];
    }
    return parts[0];
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded bg-[#5c2d91] flex items-center justify-center text-white text-xl font-semibold">
            {user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {greeting()}, {getFirstName(user?.displayName)}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* SharePoint Style Quick Links */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hızlı Bağlantılar</h2>
          <Link to="/applications" className="text-sm text-[#0078d4] hover:underline flex items-center gap-1">
            Tümünü gör <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" ref={dragRef}>
          {apps.map((app) => (
            <div
              key={app.id}
              draggable
              onDragStart={(e) => handleDragStart(e, app.id)}
              onDragOver={(e) => handleDragOver(e, app.id)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`relative transition-all ${
                draggedApp === app.id ? 'opacity-50' : ''
              } ${
                dropTarget?.id === app.id && dropTarget.position === 'before'
                  ? 'ring-2 ring-l-4 ring-[#0078d4] ring-offset-2'
                  : ''
              } ${
                dropTarget?.id === app.id && dropTarget.position === 'after'
                  ? 'ring-2 ring-r-4 ring-[#0078d4] ring-offset-2'
                  : ''
              }`}
            >
              {/* Drop indicator - before */}
              {dropTarget?.id === app.id && dropTarget.position === 'before' && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078d4] rounded-full -ml-2" />
              )}
              {/* Drop indicator - after */}
              {dropTarget?.id === app.id && dropTarget.position === 'after' && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#0078d4] rounded-full -mr-2" />
              )}
              <button
                onClick={() => handleAppLaunch(app)}
                disabled={launchingApp === app.id}
                className="w-full flex flex-col items-center p-4 border border-gray-200 dark:border-gray-600 hover:border-[#0078d4] hover:bg-[#f3f2f1] dark:hover:bg-gray-700 transition-all group disabled:opacity-50 cursor-grab active:cursor-grabbing"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-2 group-hover:bg-blue-50 dark:group-hover:bg-gray-600 transition-colors">
                  <app.icon className={`w-6 h-6 ${app.iconColor}`} />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#0078d4]">{app.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{app.description}</span>
                {launchingApp === app.id && (
                  <Loader2 className="w-4 h-4 text-[#0078d4] animate-spin mt-2" />
                )}
                {app.type === 'sso' && launchingApp !== app.id && (
                  <span className="text-xs text-green-600 mt-2">SSO</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Announcements - SharePoint News Style */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#0078d4]" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Haberler</h2>
            </div>
            <Link to="/announcements" className="text-sm text-[#0078d4] hover:underline">
              Tümünü gör
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {announcementsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-[#0078d4] animate-spin mx-auto" />
              </div>
            ) : announcementsError ? (
              <div className="p-8 text-center text-red-500 flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                <span className="text-sm">Duyurular yüklenemedi</span>
              </div>
            ) : announcements && announcements.length > 0 ? (
              announcements.map((ann) => {
                const priority = priorityConfig[ann.priority];
                return (
                  <Link
                    key={ann.id}
                    to={`/announcements/${ann.id}`}
                    className={`block p-4 hover:bg-[#f3f2f1] dark:hover:bg-gray-700 transition-colors border-l-4 ${priority.border}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ann.publishDate)}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white hover:text-[#0078d4] mb-1">
                      {ann.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {ann.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                    </p>
                  </Link>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm">Henüz duyuru yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents - SharePoint Document Library Style */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0078d4]" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Son Dökümanlar</h2>
            </div>
            <Link to="/documents" className="text-sm text-[#0078d4] hover:underline">
              Tümünü gör
            </Link>
          </div>

          {/* Document Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-[#f3f2f1] dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            <div className="col-span-6">Ad</div>
            <div className="col-span-3">Tür</div>
            <div className="col-span-3">Değiştirilme</div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-4 hover:bg-[#f3f2f1] dark:hover:bg-gray-700 transition-colors cursor-pointer group"
              >
                <div className="col-span-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <doc.icon className={`w-4 h-4 ${doc.iconColor}`} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white group-hover:text-[#0078d4] truncate">
                    {doc.title}
                  </span>
                </div>
                <div className="col-span-3 flex items-center text-sm text-gray-600 dark:text-gray-400">
                  {doc.type}
                </div>
                <div className="col-span-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  {doc.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed - SharePoint Style */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#0078d4]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Site Aktivitesi</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
            <Eye className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Son site aktiviteleri burada görünecek</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Döküman görüntüleme, düzenleme ve paylaşım aktiviteleri</p>
        </div>
      </div>
    </div>
  );
}
