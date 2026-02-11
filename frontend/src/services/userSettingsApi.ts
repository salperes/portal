import { api } from './api';

export const userSettingsApi = {
  getSettings: async (): Promise<Record<string, any>> => {
    const res = await api.get('/users/me/settings');
    return res.data.settings;
  },

  saveSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    const res = await api.put('/users/me/settings', { settings });
    return res.data.settings;
  },
};
