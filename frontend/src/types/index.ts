/**
 * Frontend Types - Re-export from @portal/core
 *
 * Bu dosya geriye uyumluluk için @portal/core'dan tipleri re-export eder.
 * Yeni kodda doğrudan @portal/core kullanın.
 */

// Announcement types
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

// User types
export type {
  User,
  AuthUser,
  UserStats,
  UserRole,
} from '@portal/core';

export {
  RoleLevel,
  RoleLabels,
  RoleColors,
  hasMinimumRole,
} from '@portal/core';
