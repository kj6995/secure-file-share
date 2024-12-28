import api from '@/lib/api/axios';
import { loginSuccess, loginFailure, setLoading, initializeAuthSuccess } from './authSlice';
import { type AppDispatch } from '../store';

interface LoginResponse {
  user?: {
    id: number;
    email: string;
    role: string;
    is_mfa_enabled: boolean;
  };
  access?: string;
  refresh?: string;
  mfa_required?: boolean;
  error?: string;
}

export const login = (data: { email: string; password: string; mfa_token?: string }) => {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await api.post<LoginResponse>('/users/login/', data);
      console.log('Login response:', response.data);
      
      // Check if MFA is required
      if (response.data.mfa_required) {
        dispatch(setLoading(false));
        return { mfa_required: true };
      }

      // Check if we have all required data
      if (!response.data.user || !response.data.access || !response.data.refresh) {
        throw new Error('Invalid server response');
      }
      
      const result = {
        user: response.data.user,
        tokens: {
          access: response.data.access,
          refresh: response.data.refresh,
        }
      };

      // Store tokens in localStorage
      localStorage.setItem('accessToken', result.tokens.access);
      localStorage.setItem('refreshToken', result.tokens.refresh);

      dispatch(loginSuccess(result));
      return result;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      dispatch(loginFailure(message));
      throw new Error(message);
    }
  };
};

export const initializeAuth = () => {
  return async (dispatch: AppDispatch) => {
    try {
      const token = localStorage.getItem('accessToken');
      const authData = localStorage.getItem('auth');
      
      console.log('Initializing auth:', { token, authData });
      
      if (token && authData) {
        try {
          // Parse the stored auth data
          const parsedAuth = JSON.parse(authData);
          
          // Verify token by making a profile request
          const response = await api.get('/users/profile/');
          console.log('Profile verification:', response.data);
          
          // Update auth state with user data and maintain tokens
          dispatch(initializeAuthSuccess({
            user: response.data,
            isAuthenticated: true,
            tokens: {
              access: token,
              refresh: localStorage.getItem('refreshToken'),
            }
          }));
        } catch (error) {
          console.error('Token validation failed:', error);
          // Clear invalid tokens and auth data
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('auth');
          dispatch(initializeAuthSuccess(null));
        }
      } else {
        console.log('No valid auth data found');
        dispatch(initializeAuthSuccess(null));
      }
    } catch (error) {
      console.error('Error in auth initialization:', error);
      dispatch(initializeAuthSuccess(null));
    }
  };
};
