import axios from 'axios';
import { useAuthStore } from '../hooks/useAuth';

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL || '/api';
  if (url.startsWith('http') && !url.endsWith('/api')) {
    return `${url.replace(/\/$/, '')}/api`;
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { doRefreshToken } = useAuthStore.getState();
        await doRefreshToken();
        const newToken = useAuthStore.getState().accessToken;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Endpoints
export const authService = {
  login: async (credentials: any) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  refresh: async (token: string) => {
    const { data } = await api.post('/auth/refresh', { token });
    return data;
  }
};

export const companyService = {
  getAll: async () => {
    const { data } = await api.get('/companies');
    return data;
  },
  create: async (company: any) => {
    const { data } = await api.post('/companies', company);
    return data;
  },
  update: async (id: string, company: any) => {
    const { data } = await api.put(`/companies/${id}`, company);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/companies/${id}`);
    return data;
  },
  testConnection: async (id: string, apiToken: string) => {
    const { data } = await api.post(`/companies/${id}/test`, { apiToken });
    return data;
  },
  sync: async (id: string) => {
    const { data } = await api.post(`/companies/${id}/sync`);
    return data;
  },
  getSellers: async (id: string) => {
    const { data } = await api.get(`/companies/${id}/sellers`);
    return data;
  }
};

export const salesService = {
  getMetrics: async (params: any) => {
    const { data } = await api.get('/sales/metrics', { params });
    return data;
  },
  getTrend: async (params: any) => {
    const { data } = await api.get('/sales/trend', { params });
    return data;
  },
  getByPayment: async (params: any) => {
    const { data } = await api.get('/sales/by-payment', { params });
    return data;
  },
  getByDocumentType: async (params: any) => {
    const { data } = await api.get('/sales/by-document-type', { params });
    return data;
  },
  getByProduct: async (params: any) => {
    const { data } = await api.get('/sales/by-product', { params });
    return data;
  },
  getBySeller: async (params: any) => {
    const { data } = await api.get('/sales/by-seller', { params });
    return data;
  },
  getByHour: async (params: any) => {
    const { data } = await api.get('/sales/by-hour', { params });
    return data;
  },
  getDetailedPayments: async (params: any) => {
    const { data } = await api.get('/sales/by-payment-detailed', { params });
    return data;
  },
  getPivot: async (params: any) => {
    const { data } = await api.get('/sales/pivot', { params });
    return data;
  },
  getDocuments: async (params: any) => {
    const { data } = await api.get('/sales/documents', { params });
    return data;
  }
};

export const goalsService = {
  getAll: async () => {
    const { data } = await api.get('/goals');
    return data;
  },
  getProgress: async () => {
    const { data } = await api.get('/goals/progress');
    return data;
  },
  create: async (goal: any) => {
    const { data } = await api.post('/goals', goal);
    return data;
  },
  update: async (id: string, goal: any) => {
    const { data } = await api.put(`/goals/${id}`, goal);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/goals/${id}`);
    return data;
  }
};

export const intelligenceService = {
  getAlerts: async (unreadOnly?: boolean) => {
    const { data } = await api.get('/intelligence/alerts', { params: { unread: unreadOnly } });
    return data;
  },
  markAlertRead: async (id: string) => {
    const { data } = await api.put(`/intelligence/alerts/${id}/read`);
    return data;
  },
  getInsights: async () => {
    const { data } = await api.get('/intelligence/insights');
    return data;
  },
  getAnomalies: async () => {
    const { data } = await api.get('/intelligence/anomalies');
    return data;
  },
  getHealth: async () => {
    const { data } = await api.get('/intelligence/health');
    return data;
  }
};

export default api;
