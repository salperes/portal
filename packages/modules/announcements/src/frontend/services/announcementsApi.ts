/**
 * Announcements API Service
 *
 * @portal/announcements frontend API client
 */

import type {
  Announcement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
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

export const announcementsApi = {
  getAll: async (includeInactive = false): Promise<Announcement[]> => {
    const params = includeInactive ? { all: 'true' } : {};
    const response = await getApi().get('/announcements', { params });
    return response.data;
  },

  getLatest: async (limit = 5): Promise<Announcement[]> => {
    const response = await getApi().get('/announcements/latest', { params: { limit } });
    return response.data;
  },

  getById: async (id: string): Promise<Announcement> => {
    const response = await getApi().get(`/announcements/${id}`);
    return response.data;
  },

  create: async (data: CreateAnnouncementDto): Promise<Announcement> => {
    const response = await getApi().post('/announcements', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAnnouncementDto): Promise<Announcement> => {
    const response = await getApi().patch(`/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await getApi().delete(`/announcements/${id}`);
  },
};
