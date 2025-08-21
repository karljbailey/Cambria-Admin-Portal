import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Shared logout function that properly calls the logout API
 * and then redirects to login page
 */
export const handleLogout = async (router: AppRouterInstance) => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // Ensure cookies are sent
    });

    if (response.ok) {
      // Add a small delay to ensure cookie clearing completes
      await new Promise(resolve => setTimeout(resolve, 100));
      // Clear any local state if needed
      router.push('/login');
    } else {
      console.error('Logout failed:', response.status);
      // Even if logout API fails, redirect to login
      router.push('/login');
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout API fails, redirect to login
    router.push('/login');
  }
};
