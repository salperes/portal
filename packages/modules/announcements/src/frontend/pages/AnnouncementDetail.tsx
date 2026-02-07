/**
 * Announcement Detail Page
 *
 * @portal/announcements
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag, AlertTriangle, Loader2 } from 'lucide-react';
import type { Announcement } from '@portal/core';
import { PriorityLabels, PriorityColors, CategoryLabels } from '@portal/core';

// API function type - injected from main app
type GetByIdFn = (id: string) => Promise<Announcement>;

interface AnnouncementDetailPageProps {
  getById: GetByIdFn;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnnouncementDetailPage({ getById }: AnnouncementDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: announcement, isLoading, error } = useQuery({
    queryKey: ['announcement', id],
    queryFn: () => getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#0078d4] hover:underline text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri</span>
        </button>
        <div className="bg-[#fde7e9] border-l-4 border-[#a80000] p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#a80000] flex-shrink-0" />
            <div>
              <p className="text-[#a80000] font-medium">Duyuru bulunamadı</p>
              <p className="text-sm text-gray-600 mt-1">Duyuru bulunamadı veya bir hata oluştu.</p>
              <Link to="/announcements" className="text-[#0078d4] hover:underline text-sm mt-2 inline-block">
                Duyurulara Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const priorityColor = PriorityColors[announcement.priority];

  return (
    <div className="max-w-4xl">
      {/* Back Link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-[#0078d4] hover:underline text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Duyurulara Dön</span>
      </button>

      {/* Main Card */}
      <div className={`bg-white border border-gray-200 overflow-hidden border-l-4 ${priorityColor.border}`}>
        {/* Priority Banner for Critical */}
        {announcement.priority === 'critical' && (
          <div className="bg-[#a80000] text-white px-5 py-2.5 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Kritik Duyuru</span>
          </div>
        )}

        <div className="p-6">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
              {PriorityLabels[announcement.priority]}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {CategoryLabels[announcement.category]}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 mb-4">{announcement.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Yayın: {formatDate(announcement.publishDate)}</span>
            </div>
            {announcement.createdBy && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{announcement.createdBy.displayName}</span>
              </div>
            )}
            {announcement.expireDate && (
              <div className="flex items-center gap-1 text-amber-600">
                <Calendar className="w-3.5 h-3.5" />
                <span>Bitiş: {formatDate(announcement.expireDate)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className="prose prose-sm prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        </div>
      </div>
    </div>
  );
}

export default AnnouncementDetailPage;
