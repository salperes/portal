import api from './api';

export const integrationsApi = {
  getRMSLaunchUrl: async (): Promise<string> => {
    const response = await api.get('/integrations/rms/launch-url');
    return response.data.url;
  },

  launchRMS: async (): Promise<void> => {
    const url = await integrationsApi.getRMSLaunchUrl();
    window.open(url, '_blank');
  },
};
