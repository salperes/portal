import api from './api';

// Rol tipleri
export type UserRole = 'viewer' | 'user' | 'supervisor' | 'admin';

export const RoleLabels: Record<UserRole, string> = {
  viewer: 'Görüntüleyici',
  user: 'Kullanıcı',
  supervisor: 'Supervisor',
  admin: 'Admin',
};

export const RoleColors: Record<UserRole, { bg: string; text: string }> = {
  viewer: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  user: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  supervisor: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  admin: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

export interface User {
  id: string;
  adUsername: string;
  email: string;
  displayName: string;
  department: string;
  title: string;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  isAdmin: boolean;
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStats {
  total: number;
  active: number;
  admins: number;
  weeklyLogins: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
}

export interface UpdateUserDto {
  displayName?: string;
  department?: string;
  title?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface RoleInfo {
  value: UserRole;
  label: string;
  level: number;
}

export const usersApi = {
  /**
   * Tüm kullanıcıları listele
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    department?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<UsersListResponse> {
    const response = await api.get<UsersListResponse>('/users', { params });
    return response.data;
  },

  /**
   * Kullanıcı istatistikleri
   */
  async getStats(): Promise<UserStats> {
    const response = await api.get<UserStats>('/users/stats');
    return response.data;
  },

  /**
   * Benzersiz departmanları listele
   */
  async getDepartments(): Promise<string[]> {
    const response = await api.get<{ departments: string[] }>('/users/departments');
    return response.data.departments;
  },

  /**
   * Mevcut rolleri listele
   */
  async getRoles(): Promise<RoleInfo[]> {
    const response = await api.get<{ roles: RoleInfo[] }>('/users/roles');
    return response.data.roles;
  },

  /**
   * Kullanıcı detayı
   */
  async getUser(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * Kullanıcı güncelle
   */
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Kullanıcı rolünü değiştir
   */
  async updateRole(id: string, role: UserRole): Promise<User> {
    const response = await api.patch<User>(`/users/${id}/role`, { role });
    return response.data;
  },

  /**
   * Kullanıcıyı aktif et
   */
  async activateUser(id: string): Promise<User> {
    const response = await api.patch<User>(`/users/${id}/activate`);
    return response.data;
  },

  /**
   * Kullanıcıyı pasif yap
   */
  async deactivateUser(id: string): Promise<User> {
    const response = await api.patch<User>(`/users/${id}/deactivate`);
    return response.data;
  },

  /**
   * Kullanıcının gruplarını getir
   */
  async getUserGroups(userId: string): Promise<any[]> {
    const response = await api.get(`/users/${userId}/groups`);
    return response.data;
  },

  /**
   * Kullanıcıyı sil
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

export default usersApi;
