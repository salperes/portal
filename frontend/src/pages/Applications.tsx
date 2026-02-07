import { useState } from 'react';
import {
  Grid3X3,
  ExternalLink,
  Loader2,
  Search,
  ClipboardList,
  BarChart3,
  Headphones,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { integrationsApi } from '../services/integrations';

interface Application {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  category: string;
  type: 'sso' | 'link';
  url?: string;
}

const applications: Application[] = [
  {
    id: 'rms',
    name: 'RMS',
    description: 'Requirements Management System - Gereksinim yönetim sistemi',
    icon: ClipboardList,
    iconBg: 'bg-blue-100',
    iconColor: 'text-[#0078d4]',
    category: 'Proje Yönetimi',
    type: 'sso',
  },
  {
    id: 'erp',
    name: 'ERP',
    description: 'Kurumsal kaynak planlama sistemi',
    icon: BarChart3,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    category: 'Finans',
    type: 'link',
    url: 'https://msspektral.odoo.com/odoo',
  },
  {
    id: 'helpdesk',
    name: 'Helpdesk',
    description: 'IT destek talep sistemi',
    icon: Headphones,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    category: 'IT',
    type: 'link',
    url: '#',
  },
  {
    id: 'hr',
    name: 'HR Portal',
    description: 'İnsan kaynakları self servis portalı',
    icon: Users,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    category: 'İK',
    type: 'link',
    url: 'https://app.inoportal.com',
  },
];

const categories = ['Tümü', ...new Set(applications.map((app) => app.category))];

export default function Applications() {
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  const handleAppLaunch = async (app: Application) => {
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

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      searchQuery === '' ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tümü' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* SharePoint Style Page Header */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded bg-[#0078d4] flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Uygulamalar</h1>
            <p className="text-sm text-gray-500">Şirket içi uygulamalara hızlı ve güvenli erişim</p>
          </div>
        </div>

        {/* Search & Filter - SharePoint Command Bar Style */}
        <div className="flex flex-col lg:flex-row gap-3 pt-4 border-t border-gray-200">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Uygulama ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0078d4] text-sm"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0078d4] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Grid - SharePoint App Tiles Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="bg-white border border-gray-200 hover:border-[#0078d4] hover:shadow-md transition-all group"
          >
            <div className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded ${app.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <app.icon className={`w-7 h-7 ${app.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#0078d4] transition-colors">
                    {app.name}
                  </h3>
                  <span className="text-xs text-gray-500">{app.category}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{app.description}</p>

              {app.type === 'sso' && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 w-fit mb-4">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  SSO Etkin
                </div>
              )}

              <button
                onClick={() => handleAppLaunch(app)}
                disabled={launchingApp === app.id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {launchingApp === app.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Açılıyor...</span>
                  </>
                ) : (
                  <>
                    <span>Aç</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Grid3X3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Uygulama bulunamadı</h3>
          <p className="text-gray-500 text-sm">Arama kriterlerinize uygun uygulama yok.</p>
        </div>
      )}
    </div>
  );
}
