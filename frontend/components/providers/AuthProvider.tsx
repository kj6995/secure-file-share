'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/store';
import { initializeAuth } from '@/lib/store/features/authActions';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!authState?.isInitialized) {
      console.log('AuthProvider - Starting initialization');
      dispatch(initializeAuth());
    }
  }, [dispatch, authState?.isInitialized]);

  // Log auth state changes
  useEffect(() => {
    console.log('AuthProvider - Current auth state:', authState);
  }, [authState]);

  return <>{children}</>;
}
