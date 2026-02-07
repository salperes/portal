/**
 * @portal/announcements
 *
 * Announcements modülü - Şirket duyuruları yönetimi
 *
 * Usage:
 * - Types: import { Announcement } from '@portal/announcements'
 * - Frontend: import { AnnouncementsPage } from '@portal/announcements/frontend'
 */

// Re-export types from @portal/core
export type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '@portal/core';

export {
  CategoryLabels,
  CategoryColors,
  PriorityLabels,
  PriorityColors,
} from '@portal/core';

// Frontend exports
export * from './frontend';
