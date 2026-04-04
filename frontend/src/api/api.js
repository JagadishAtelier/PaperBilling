import axios from 'axios';

// Base API URL
export const BASE_API = import.meta.env.VITE_API_URL || "http://localhost:10000/api/v1";

// Create axios instance
const api = axios.create({
  baseURL: BASE_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't show toast for login requests - let the login page handle it
    const isLoginRequest = error.config?.url?.includes('/login');

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expired or invalid
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Show error toast notification for all other errors
    if (!isLoginRequest) {
      // Import message dynamically to avoid circular dependencies
      import('antd').then(({ message }) => {
        let errorMessage = 'An error occurred';

        if (error.response) {
          // Server responded with error status
          const status = error.response.status;
          const data = error.response.data;

          // Try to get error message from response
          errorMessage = data?.message || data?.error || errorMessage;

          // Customize message based on status code
          switch (status) {
            case 400:
              errorMessage = data?.message || 'Invalid request';
              break;
            case 403:
              errorMessage = 'Access denied';
              break;
            case 404:
              errorMessage = data?.message || 'Resource not found';
              break;
            case 409:
              errorMessage = data?.message || 'Conflict - Resource already exists';
              break;
            case 422:
              errorMessage = data?.message || 'Validation error';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later';
              break;
            case 502:
              errorMessage = 'Server is unavailable';
              break;
            case 503:
              errorMessage = 'Service temporarily unavailable';
              break;
            default:
              errorMessage = data?.message || `Error: ${status}`;
          }
        } else if (error.request) {
          // Request made but no response received
          errorMessage = 'Network error. Please check your connection';
        } else {
          // Something else happened
          errorMessage = error.message || 'An unexpected error occurred';
        }

        // Display error toast
        message.error({
          content: errorMessage,
          duration: 4,
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
