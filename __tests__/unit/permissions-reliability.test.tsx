import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useClientPermissions } from '../../lib/hooks/useClientPermissions';

// Mock fetch
global.fetch = jest.fn();

// Test component to test the hook
function TestComponent({ userId, clientCode }: { userId?: string; clientCode?: string }) {
  const {
    canReadClient,
    canWriteClient,
    canAdminClient,
    loading,
    error,
    isAdmin,
    accessibleClients,
    userPermissions,
    refreshPermissions
  } = useClientPermissions(userId);

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="admin">{isAdmin ? 'admin' : 'user'}</div>
      <div data-testid="accessible-clients">{accessibleClients.join(',')}</div>
      <div data-testid="permissions-count">{userPermissions.length}</div>
      {clientCode && (
        <>
          <div data-testid="can-read">{canReadClient(clientCode) ? 'yes' : 'no'}</div>
          <div data-testid="can-write">{canWriteClient(clientCode) ? 'yes' : 'no'}</div>
          <div data-testid="can-admin">{canAdminClient(clientCode) ? 'yes' : 'no'}</div>
        </>
      )}
      <button data-testid="refresh" onClick={refreshPermissions}>Refresh</button>
    </div>
  );
}

describe('Permissions Reliability Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Admin User', () => {
    it('should grant admin access immediately', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        status: 'active'
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, user: mockUser })
        });

      render(<TestComponent userId="admin-123" clientCode="CAM" />);

      // Should show loading initially
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should be admin
      expect(screen.getByTestId('admin')).toHaveTextContent('admin');

      // Should have access to any client
      expect(screen.getByTestId('can-read')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-write')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-admin')).toHaveTextContent('yes');
    });
  });

  describe('Basic User with Permissions', () => {
    it('should grant access to permitted clients only', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Basic User',
        role: 'basic',
        status: 'active'
      };

      const mockPermissions = [
        {
          clientCode: 'CAM',
          clientName: 'Cambria',
          permissionType: 'read',
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, user: mockUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, permissions: mockPermissions })
        });

      render(<TestComponent userId="user-123" clientCode="CAM" />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should not be admin
      expect(screen.getByTestId('admin')).toHaveTextContent('user');

      // Should have access to permitted client
      expect(screen.getByTestId('can-read')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-write')).toHaveTextContent('no');
      expect(screen.getByTestId('can-admin')).toHaveTextContent('no');

      // Should show accessible clients
      expect(screen.getByTestId('accessible-clients')).toHaveTextContent('CAM');
    });

    it('should deny access to non-permitted clients', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Basic User',
        role: 'basic',
        status: 'active'
      };

      const mockPermissions = [
        {
          clientCode: 'CAM',
          clientName: 'Cambria',
          permissionType: 'read',
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, user: mockUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, permissions: mockPermissions })
        });

      render(<TestComponent userId="user-123" clientCode="TEST" />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should not have access to non-permitted client
      expect(screen.getByTestId('can-read')).toHaveTextContent('no');
      expect(screen.getByTestId('can-write')).toHaveTextContent('no');
      expect(screen.getByTestId('can-admin')).toHaveTextContent('no');
    });
  });

  describe('Case Insensitive Matching', () => {
    it('should match client codes case-insensitively', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Basic User',
        role: 'basic',
        status: 'active'
      };

      const mockPermissions = [
        {
          clientCode: 'CAM',
          clientName: 'Cambria',
          permissionType: 'read',
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, user: mockUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, permissions: mockPermissions })
        });

      render(<TestComponent userId="user-123" clientCode="cam" />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should have access despite case difference
      expect(screen.getByTestId('can-read')).toHaveTextContent('yes');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<TestComponent userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should show error state
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });

    it('should handle missing user gracefully', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should show error for missing user ID
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh permissions when called', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Basic User',
        role: 'basic',
        status: 'active'
      };

      const mockPermissions = [
        {
          clientCode: 'CAM',
          clientName: 'Cambria',
          permissionType: 'read',
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, user: mockUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, permissions: mockPermissions })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, user: mockUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, permissions: mockPermissions })
        });

      render(<TestComponent userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Click refresh button
      await act(async () => {
        screen.getByTestId('refresh').click();
      });

      // Should show loading again
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      // Should load again
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });
  });
});
