/**
 * User Types - Shared between backend and frontend
 */

// Kullanıcı rolleri - yetki seviyesine göre sıralı
export type UserRole = 'viewer' | 'user' | 'supervisor' | 'admin';

// Rol seviye haritası (yetki kontrolü için)
export const RoleLevel: Record<UserRole, number> = {
  viewer: 1,
  user: 2,
  supervisor: 3,
  admin: 4,
};

// Rol labels (UI için)
export const RoleLabels: Record<UserRole, string> = {
  viewer: 'İzleyici',
  user: 'Kullanıcı',
  supervisor: 'Yönetici',
  admin: 'Admin',
};

// Rol colors (UI için)
export const RoleColors: Record<UserRole, { bg: string; text: string }> = {
  viewer: { bg: 'bg-gray-100', text: 'text-gray-700' },
  user: { bg: 'bg-blue-100', text: 'text-blue-700' },
  supervisor: { bg: 'bg-amber-100', text: 'text-amber-700' },
  admin: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

// Temel kullanıcı bilgileri (API response)
export interface User {
  id: string;
  adUsername: string;
  email: string | null;
  displayName: string | null;
  department: string | null;
  title: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// Login response'ta dönen kullanıcı bilgisi
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  department: string;
  role: UserRole;
  isAdmin: boolean;
}

// Kullanıcı istatistikleri
export interface UserStats {
  total: number;
  active: number;
  admins: number;
  weeklyLogins: number;
}

// Helper function - minimum rol kontrolü
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return RoleLevel[userRole] >= RoleLevel[requiredRole];
}
