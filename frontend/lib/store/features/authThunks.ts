import api from '@/lib/api/axios';
import { AppDispatch } from '../store';
import { setLoading, loginSuccess, loginFailure } from './authSlice';

// Register thunk
export const register = (data: { 
  email: string; 
  password: string; 
  password2: string;
  role: string 
}) => {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await api.post('/users/register/', data);
      
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
      localStorage.setItem('auth', JSON.stringify({ user: result.user }));

      dispatch(loginSuccess(result));
      return result;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Registration failed';
      dispatch(loginFailure(message));
      throw new Error(message);
    } finally {
      dispatch(setLoading(false));
    }
  };
};
