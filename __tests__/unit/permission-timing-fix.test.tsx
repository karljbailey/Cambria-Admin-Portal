import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../app/page';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Permission Timing Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should fetch clients after permissions are loaded (no infinite loop)', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      }
    ];

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true },
      { clientCode: 'CLIENT002', clientName: 'Client 2', fullName: 'Full Client 2', active: true }
    ];

    // Mock the sequence of API calls
    (fetch as jest.Mock)
      // Call 1: Auth session check
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      // Call 2: Permissions fetch (from useClientPermissions hook)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      // Call 3: Admin status check (from useClientPermissions hook)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      // Call 4: Clients fetch (after permissions are loaded)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<Dashboard />);

    // Wait for authentication to complete
    await waitFor(() => {
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    // Wait for clients to be loaded and filtered
    await waitFor(() => {
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.queryByText('Client 2')).not.toBeInTheDocument();
    });

    // Verify that fetch was called exactly 4 times (no infinite loop)
    expect(fetch).toHaveBeenCalledTimes(4);
    
    // Verify the API calls were made in the correct order
    const calls = (fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('/api/auth/session'); // Auth check
    expect(calls[1][0]).toBe('/api/permissions/client?userId=test-user-123'); // Permissions
    expect(calls[2][0]).toBe('/api/auth/session'); // Admin status check
    expect(calls[3][0]).toBe('/api/clients'); // Clients
  });

  it('should not cause infinite loops when permissions change', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      }
    ];

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Client 1')).toBeInTheDocument();
    });

    // Should only call fetch 4 times total (no infinite loop)
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('should handle admin users correctly', async () => {
    const adminUser = {
      authenticated: true,
      user: {
        id: 'admin-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    };

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true },
      { clientCode: 'CLIENT002', clientName: 'Client 2', fullName: 'Full Client 2', active: true }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(adminUser)
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(adminUser)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
    });

    // Admin should see all clients
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});


