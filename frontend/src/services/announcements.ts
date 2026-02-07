import api from './api';
import type { Announcement, CreateAnnouncementDto, UpdateAnnouncementDto } from '../types';

export const announcementsApi = {
  getAll: async (includeInactive = false): Promise<Announcement[]> => {
    const params = includeInactive ? { all: 'true' } : {};
    const response = await api.get('/announcements', { params });
    return response.data;
  },

  getLatest: async (limit = 5): Promise<Announcement[]> => {
    const response = await api.get('/announcements/latest', { params: { limit } });
    return response.data;
  },

  getById: async (id: string): Promise<Announcement> => {
    const response = await api.get(`/announcements/${id}`);
    return response.data;
  },

  create: async (data: CreateAnnouncementDto): Promise<Announcement> => {
    const response = await api.post('/announcements', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAnnouncementDto): Promise<Announcement> => {
    const response = await api.patch(`/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/announcements/${id}`);
  },
};
