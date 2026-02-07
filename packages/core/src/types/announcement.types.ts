/**
 * Announcement Types - Shared between backend and frontend
 */

export type AnnouncementCategory = 'general' | 'hr' | 'it' | 'finance';
export type AnnouncementPriority = 'critical' | 'important' | 'info';

// Kategori labels (UI için)
export const CategoryLabels: Record<AnnouncementCategory, string> = {
  general: 'Genel',
  hr: 'İK',
  it: 'BT',
  finance: 'Finans',
};

// Kategori colors (UI için)
export const CategoryColors: Record<AnnouncementCategory, { bg: string; text: string }> = {
  general: { bg: 'bg-gray-100', text: 'text-gray-700' },
  hr: { bg: 'bg-purple-100', text: 'text-purple-700' },
  it: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  finance: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

// Öncelik labels (UI için)
export const PriorityLabels: Record<AnnouncementPriority, string> = {
  critical: 'Kritik',
  important: 'Önemli',
  info: 'Bilgi',
};

// Öncelik colors (UI için)
export const PriorityColors: Record<AnnouncementPriority, { border: string; bg: string; text: string }> = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  important: { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  info: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
};

// Duyuru entity
export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  isActive: boolean;
  publishDate: string;
  expireDate: string | null;
  createdById: string | null;
  createdBy: {
    id: string;
    displayName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// DTO'lar
export interface CreateAnnouncementDto {
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority?: AnnouncementPriority;
  publishDate?: string;
  expireDate?: string;
  isActive?: boolean;
}

export interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {}
