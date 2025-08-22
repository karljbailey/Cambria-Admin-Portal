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

  it('should fetch clients after permissions are loaded', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true },
      { clientCode: 'CLIENT002', clientName: 'Client 2', fullName: 'Full Client 2', active: true },
      { clientCode: 'CLIENT003', clientName: 'Client 3', fullName: 'Full Client 3', active: true }
    ];

    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      }
    ];

    // Mock the sequence of API calls
    (fetch as jest.Mock)
      // First call: auth session
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      // Second call: permissions (this will be called by the hook)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      // Third call: admin status check
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      // Fourth call: clients (this should be called after permissions are loaded)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<Dashboard />);

    // Wait for the loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    // Wait for clients to be loaded and filtered
    await waitFor(() => {
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
      expect(screen.queryByText('Client 3')).not.toBeInTheDocument();
    });

    // Verify that fetch was called the expected number of times
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('should show all clients for admin users even before permissions are loaded', async () => {
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
      { clientCode: 'CLIENT002', clientName: 'Client 2', fullName: 'Full Client 2', active: true },
      { clientCode: 'CLIENT003', clientName: 'Client 3', fullName: 'Full Client 3', active: true }
    ];

    (fetch as jest.Mock)
      // Auth session
      .mockResolvedValueOnce({
        json: () => Promise.resolve(adminUser)
      })
      // Permissions (empty for admin)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      // Admin status check
      .mockResolvedValueOnce({
        json: () => Promise.resolve(adminUser)
      })
      // Clients
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
      expect(screen.getByText('Client 3')).toBeInTheDocument();
    });
  });

  it('should show no access message when user has no permissions', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
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
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('No client access')).toBeInTheDocument();
      expect(screen.getByText("You don't have access to any clients. Contact an administrator to request access.")).toBeInTheDocument();
    });
  });

  it('should handle permission API errors gracefully', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockRejectedValueOnce(new Error('Permission API Error'))
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('No client access')).toBeInTheDocument();
    });
  });

  it('should not fetch clients multiple times unnecessarily', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true }
    ];

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

    // Should only call fetch 4 times: auth, permissions, admin check, clients
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});

