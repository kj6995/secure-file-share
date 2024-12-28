'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { UserProfile } from '@/components/auth/UserProfile';
import { useEffect, useState } from 'react';

export function Header() {
  const auth = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="mx-auto px-4 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="font-bold sm:inline-block">
              Secure File Share
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          <nav className="flex items-center">
            {mounted && auth?.isAuthenticated && auth?.user && (
              <UserProfile />
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
