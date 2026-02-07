/**
 * @portal/core
 *
 * MSS Portal için ortak tipler ve yardımcı fonksiyonlar.
 * Backend ve frontend tarafından paylaşılır.
 *
 * Usage:
 * - Types (frontend): import { Announcement, User } from '@portal/core'
 * - Entities (backend): import { User, Announcement } from '@portal/core/entities'
 */

// Types (interfaces for frontend - no TypeORM dependency)
export * from './types';

// Note: Entities are exported from '@portal/core/entities' separately
// to avoid TypeORM dependency in frontend code.
