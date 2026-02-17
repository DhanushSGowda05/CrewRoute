import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '../../config/api.config';
import { useAuthStore } from '../../stores';

class BaseApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // ✅ Request interceptor — always gets a FRESH token from Clerk
    this.api.interceptors.request.use(
      async (config) => {
        const { getFreshToken, token } = useAuthStore.getState();

        let authToken: string | null = null;

        if (getFreshToken) {
          // ✅ BEST: Always fetch a fresh Clerk JWT (handles expiry automatically)
          authToken = await getFreshToken();
          // Keep the in-memory store in sync
          if (authToken) {
            useAuthStore.getState().setToken(authToken);
          }
        } else if (token) {
          // Fallback: use in-memory token if getFreshToken not registered yet
          authToken = token;
        }

        console.log('📦 Request:', config.url);
        console.log('🔐 Token exists:', !!authToken);

        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;

          // ✅ On 401, try to refresh token once and retry
          if (status === 401) {
            const { getFreshToken, setToken } = useAuthStore.getState();

            if (getFreshToken) {
              console.warn('🔄 401 received — refreshing Clerk token and retrying...');
              const freshToken = await getFreshToken();

              if (freshToken) {
                setToken(freshToken);
                // Retry the original request with the new token
                const originalRequest = error.config!;
                originalRequest.headers.Authorization = `Bearer ${freshToken}`;
                return this.api(originalRequest);
              }
            }

            console.error('❌ 401 Unauthorized — could not refresh token');
          }

          console.error('API Error:', status, error.response.data);
        } else if (error.request) {
          console.error('Network Error:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  getInstance(): AxiosInstance {
    return this.api;
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url);
    return response.data;
  }
}

export const apiService = new BaseApiService();