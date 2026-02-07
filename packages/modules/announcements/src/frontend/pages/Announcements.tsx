/**
 * Announcements List Page
 *
 * @portal/announcements
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Calendar, User, ChevronRight, Search, Filter, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
} from '@portal/core';
import {
  CategoryLabels,
  CategoryColors,
  PriorityLabels,
  PriorityColors,
} from '@portal/core';

// API function type - injected from main app
type GetAllFn = (includeInactive?: boolean) => Promise<Announcement[]>;

interface AnnouncementsPageProps {
  getAll: GetAllFn;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AnnouncementsPage({ getAll }: AnnouncementsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<AnnouncementPriority | 'all'>('all');

  const { data: announcements, isLoading, error } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => getAll(),
  });

  const filteredAnnouncements = announcements?.filter((ann) => {
    const matchesSearch =
      searchQuery === '' ||
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ann.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || ann.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fde7e9] border-l-4 border-[#a80000] p-4">
        <p className="text-[#a80000]">Duyurular yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  const categories = Object.keys(CategoryLabels) as AnnouncementCategory[];
  const priorities = Object.keys(PriorityLabels) as AnnouncementPriority[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded bg-[#0078d4] flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Duyurular</h1>
            <p className="text-sm text-gray-500">Şirket genelindeki tüm duyuruları görüntüleyin</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 pt-4 border-t border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Duyuru ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0078d4] text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as AnnouncementCategory | 'all')}
              className="px-3 py-2 border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#0078d4] text-sm"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((key) => (
                <option key={key} value={key}>{CategoryLabels[key]}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as AnnouncementPriority | 'all')}
            className="px-3 py-2 border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#0078d4] text-sm"
          >
            <option value="all">Tüm Öncelikler</option>
            {priorities.map((key) => (
              <option key={key} value={key}>{PriorityLabels[key]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200">
        {filteredAnnouncements?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Duyuru bulunamadı</h3>
            <p className="text-gray-500 text-sm">Arama kriterlerinize uygun duyuru yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAnnouncements?.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const priorityColor = PriorityColors[announcement.priority];
  const categoryColor = CategoryColors[announcement.category];

  return (
    <Link
      to={`/announcements/${announcement.id}`}
      className={`block p-5 hover:bg-[#f3f2f1] transition-colors border-l-4 ${priorityColor.border} group`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
              {PriorityLabels[announcement.priority]}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium ${categoryColor.bg} ${categoryColor.text}`}>
              {CategoryLabels[announcement.category]}
            </span>
          </div>

          <h3 className="text-base font-medium text-gray-900 group-hover:text-[#0078d4] transition-colors mb-1">
            {announcement.title}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {announcement.content.replace(/<[^>]*>/g, '').substring(0, 200)}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(announcement.publishDate)}</span>
            </div>
            {announcement.createdBy && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{announcement.createdBy.displayName}</span>
              </div>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#0078d4] flex-shrink-0 mt-2" />
      </div>
    </Link>
  );
}

export default AnnouncementsPage;
