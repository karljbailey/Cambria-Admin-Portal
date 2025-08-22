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

describe('Full Permission Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should complete full flow: auth -> permissions -> clients -> display', async () => {
    // Step 1: Mock authentication
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    // Step 2: Mock permissions API response
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

    // Step 3: Mock clients API response
    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true },
      { clientCode: 'CLIENT002', clientName: 'Client 2', fullName: 'Full Client 2', active: true },
      { clientCode: 'CLIENT003', clientName: 'Client 3', fullName: 'Full Client 3', active: true }
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

    // Step 4: Wait for authentication to complete
    await waitFor(() => {
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    // Step 5: Wait for permissions to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Step 6: Verify that only accessible clients are displayed
    await waitFor(() => {
      // Should show CLIENT001 and CLIENT002 (user has permissions)
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
      
      // Should NOT show CLIENT003 (user has no permission)
      expect(screen.queryByText('Client 3')).not.toBeInTheDocument();
    });

    // Step 7: Verify API call sequence
    expect(fetch).toHaveBeenCalledTimes(4);
    
    // Verify the API calls were made in the correct order
    const calls = (fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('/api/auth/session'); // Auth check
    expect(calls[1][0]).toBe('/api/permissions/client?userId=test-user-123'); // Permissions
    expect(calls[2][0]).toBe('/api/auth/session'); // Admin status check
    expect(calls[3][0]).toBe('/api/clients'); // Clients
  });

  it('should handle admin user flow correctly', async () => {
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
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // Admin should see all clients
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
      expect(screen.getByText('Client 3')).toBeInTheDocument();
      
      // Admin should see the "Add Client" button
      expect(screen.getByText('Add Client')).toBeInTheDocument();
    });
  });

  it('should handle user with no permissions correctly', async () => {
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
      // Should show no access message
      expect(screen.getByText('No client access')).toBeInTheDocument();
      expect(screen.getByText("You don't have access to any clients. Contact an administrator to request access.")).toBeInTheDocument();
      
      // Should NOT show any clients
      expect(screen.queryByText('Client 1')).not.toBeInTheDocument();
      
      // Should NOT show Add Client button
      expect(screen.queryByText('Add Client')).not.toBeInTheDocument();
    });
  });

  it('should handle permission API failure gracefully', async () => {
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
      // Should show no access message when permissions fail
      expect(screen.getByText('No client access')).toBeInTheDocument();
    });
  });

  it('should handle client API failure gracefully', async () => {
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
      .mockRejectedValueOnce(new Error('Client API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // Should show error message
      expect(screen.getByText('Failed to fetch clients')).toBeInTheDocument();
    });
  });

  it('should handle permission hierarchy correctly in UI', async () => {
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
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT003',
        clientName: 'Client 3',
        permissionType: 'admin',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-03'),
        expiresAt: undefined
      }
    ];

    const mockClients = [
      { clientCode: 'CLIENT001', clientName: 'Client 1', fullName: 'Full Client 1', active: true },
      { clientCode: 'CLIENT002', clientName: 'Client 2', fullName: 'Full Client 2', active: true },
      { clientCode: 'CLIENT003', clientName: 'Client 3', fullName: 'Full Client 3', active: true }
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
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // User should see all three clients (has permissions for all)
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
      expect(screen.getByText('Client 3')).toBeInTheDocument();
    });
  });
});

