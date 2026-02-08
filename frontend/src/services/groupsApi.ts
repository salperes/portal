import api from './api';
import type { Group, UserGroup, GroupRole, CreateGroupDto, UpdateGroupDto } from '@portal/core';

export type { Group, UserGroup, GroupRole } from '@portal/core';
export { GroupRoleLabels, GroupRoleColors } from '@portal/core';

export const groupsApi = {
  getAll: async (params?: { projectId?: string }): Promise<Group[]> => {
    const response = await api.get('/groups', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Group & { members: UserGroup[] }> => {
    const response = await api.get(`/groups/${id}`);
    return response.data;
  },

  create: async (data: CreateGroupDto): Promise<Group> => {
    const response = await api.post('/groups', data);
    return response.data;
  },

  update: async (id: string, data: UpdateGroupDto): Promise<Group> => {
    const response = await api.patch(`/groups/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/groups/${id}`);
  },

  addMember: async (groupId: string, userId: string, role?: GroupRole): Promise<UserGroup> => {
    const response = await api.post(`/groups/${groupId}/members`, { userId, role });
    return response.data;
  },

  updateMember: async (groupId: string, userId: string, role: GroupRole): Promise<UserGroup> => {
    const response = await api.patch(`/groups/${groupId}/members/${userId}`, { role });
    return response.data;
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },
};
