import axios from 'axios';

// Base instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle 401 & Broadcast Mutations
api.interceptors.response.use(
  (response) => {
    // If it's a mutating request, broadcast an event
    const method = response.config.method?.toUpperCase();
    if (method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app:data-mutated'));
      }
    }
    return response.data; // Note: returns the raw data (the NestJS response envelope)
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
