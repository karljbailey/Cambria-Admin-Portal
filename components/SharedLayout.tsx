'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { handleLogout } from '@/lib/auth-utils';
import MobileNavigation from '@/components/MobileNavigation';
import MobileMenuButton from '@/components/MobileMenuButton';

interface SharedLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

export default function SharedLayout({ children, currentPage = 'dashboard' }: SharedLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; name?: string; role?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Sidebar */}
      <MobileNavigation 
        user={user}
        currentPage={currentPage}
        onLogout={() => handleLogout(router)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Menu Button */}
            <div className="flex items-center">
              <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
            </div>

            {/* Center - Title */}
            <div className="flex items-center">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Cambria Portal</h1>
            </div>
            
            {/* Right side - Profile Avatar */}
            {user && (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
