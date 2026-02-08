/**
 * Groups API Service
 *
 * @portal/groups frontend API client
 */

import type {
  Group,
  UserGroup,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupMemberDto,
  UpdateGroupMemberDto,
} from '@portal/core';

// API instance will be injected from the main app
let apiInstance: any = null;

export const setApiInstance = (api: any) => {
  apiInstance = api;
};

const getApi = () => {
  if (!apiInstance) {
    throw new Error('API instance not set. Call setApiInstance first.');
  }
  return apiInstance;
};

export const groupsApi = {
  // Group CRUD
  getAll: async (): Promise<Group[]> => {
    const response = await getApi().get('/groups');
    return response.data;
  },

  getById: async (id: string): Promise<Group & { members: UserGroup[] }> => {
    const response = await getApi().get(`/groups/${id}`);
    return response.data;
  },

  create: async (data: CreateGroupDto): Promise<Group> => {
    const response = await getApi().post('/groups', data);
    return response.data;
  },

  update: async (id: string, data: UpdateGroupDto): Promise<Group> => {
    const response = await getApi().patch(`/groups/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await getApi().delete(`/groups/${id}`);
  },

  // Member management
  addMember: async (groupId: string, data: AddGroupMemberDto): Promise<UserGroup> => {
    const response = await getApi().post(`/groups/${groupId}/members`, data);
    return response.data;
  },

  updateMember: async (groupId: string, userId: string, data: UpdateGroupMemberDto): Promise<UserGroup> => {
    const response = await getApi().patch(`/groups/${groupId}/members/${userId}`, data);
    return response.data;
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await getApi().delete(`/groups/${groupId}/members/${userId}`);
  },
};
