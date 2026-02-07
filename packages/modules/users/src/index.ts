/**
 * @portal/users
 *
 * Users modülü - Kullanıcı yönetimi
 *
 * Usage:
 * - Types: import { User, UserRole } from '@portal/users'
 */

// Re-export core types from @portal/core
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

// Additional types for users module
export interface UsersListResponse {
  users: import('@portal/core').User[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateUserDto {
  displayName?: string;
  department?: string;
  title?: string;
  role?: import('@portal/core').UserRole;
  isActive?: boolean;
}

export interface RoleInfo {
  value: import('@portal/core').UserRole;
  label: string;
  level: number;
}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  role?: import('@portal/core').UserRole;
  department?: string;
  isActive?: boolean;
  search?: string;
}

// Note: NestJS module is in backend/src/users/
// Frontend page is in frontend/src/pages/admin/UsersAdmin.tsx
