import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Types
export interface User {
  id: number;
  email: string;
  role: string;
  is_mfa_enabled: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  tokens: {
    access: string | null;
    refresh: string | null;
  };
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  tokens: {
    access: null,
    refresh: null,
  },
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.tokens.access = null;
      state.tokens.refresh = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth');
      }
    },
    initializeAuthSuccess(state, action: PayloadAction<{ 
      user: User | null; 
      isAuthenticated: boolean; 
      tokens: { 
        access: string | null; 
        refresh: string | null; 
      } 
    } | null>) {
      if (action.payload) {
        state.user = action.payload.user;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.tokens = action.payload.tokens;
      } else {
        state.user = null;
        state.isAuthenticated = false;
        state.tokens = { access: null, refresh: null };
      }
      state.isInitialized = true;
    },
    loginSuccess(state, action: PayloadAction<{
      user: User;
      tokens: {
        access: string;
        refresh: string;
      };
    }>) {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.tokens = action.payload.tokens;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth', JSON.stringify({ user: action.payload.user }));
      }
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isAuthenticated = false;
    },
  },
});

// Actions
export const {
  setUser,
  setLoading,
  setError,
  logout,
  initializeAuthSuccess,
  loginSuccess,
  loginFailure,
} = authSlice.actions;

export default authSlice.reducer;
