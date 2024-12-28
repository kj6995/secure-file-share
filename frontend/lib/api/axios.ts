import axios from 'axios';
import { store } from '@/lib/store/store';
import { logout } from '@/lib/store/features/authSlice';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to ensure trailing slashes and add auth token
api.interceptors.request.use(
  (config) => {
    // Add trailing slash if not present and not a file upload
    if (!config.url?.endsWith('/') && !config.url?.includes('.')) {
      config.url = `${config.url}/`;
    }

    // Add auth token
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.log('No refresh token found, logging out');
          handleLogout();
          return Promise.reject(error);
        }

        const response = await axios.post('http://localhost:8000/api/users/token/refresh/', {
          refresh: refreshToken
        });

        const { access } = response.data;
        
        // Update the access token
        localStorage.setItem('accessToken', access);
        
        // Update the Authorization header
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        handleLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

function handleLogout() {
  store.dispatch(logout());
}

export default api;
