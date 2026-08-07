import axios from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  error?: string;
}

// Custom Axios instance type that returns data directly instead of AxiosResponse
interface ApiInstance {
  get<T = any>(url: string, config?: any): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>>;
  request<T = any>(config: any): Promise<ApiResponse<T>>;
  (config: any): Promise<ApiResponse<any>>;
  interceptors: any;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
}) as unknown as ApiInstance;
api.interceptors.request.use(
  (config: any) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Track whether a refresh is already in flight to avoid multiple simultaneous refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Response Interceptor to handle 401 & Broadcast Mutations
api.interceptors.response.use(
  (response: any) => {
    // If it's a mutating request, broadcast an event
    const method = response.config.method?.toUpperCase();
    if (method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app:data-mutated'));
      }
    }
    return response.data; // Note: returns the raw data (the NestJS response envelope)
  },
  async (error: any) => {
    const originalRequest = error.config;

    // Never interfere with 401s while on the login page — doing so causes a
    // race condition where an in-flight expired-token request from initializeAuth
    // wipes the token that was JUST stored by a successful login POST.
    const onLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
    if (onLoginPage) {
      return Promise.reject(error);
    }

    // Skip interceptor for the login/refresh endpoints themselves
    const url: string = originalRequest?.url || '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // If 401 and we haven't already tried to refresh for this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (!refreshToken) {
        // No refresh token — hard logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            api(originalRequest).then(resolve).catch(reject);
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
        const newAccessToken = res.data?.data?.accessToken;
        const newRefreshToken = res.data?.data?.refreshToken;

        if (!newAccessToken) throw new Error('Refresh failed');

        localStorage.setItem('token', newAccessToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        onRefreshed(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — log out completely
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
