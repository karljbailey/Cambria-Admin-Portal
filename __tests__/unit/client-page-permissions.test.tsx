import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientPage from '../../app/client/[code]/page';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router and params
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useParams: () => ({
    code: 'CLIENT001'
  })
}));

// Mock audit helpers
jest.mock('../../lib/audit', () => ({
  auditHelpers: {
    clientViewed: jest.fn(),
  }
}));

describe('Client Page Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should show client data for user with read permission', async () => {
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
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        fullName: 'Full Client 1',
        folderId: 'folder123',
        active: true
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

    render(<ClientPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading permissions...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading client data...')).not.toBeInTheDocument();
    });

    // Should show client data
    await waitFor(() => {
      expect(screen.getByText('Full Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 1')).toBeInTheDocument();
    });

    // Should NOT show edit button (read permission only)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('should show edit button for user with write permission', async () => {
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
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      }
    ];

    const mockClients = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        fullName: 'Full Client 1',
        folderId: 'folder123',
        active: true
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

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Full Client 1')).toBeInTheDocument();
    });

    // Should show edit button (write permission)
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('should deny access for user without permission', async () => {
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
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        fullName: 'Full Client 1',
        folderId: 'folder123',
        active: true
      }
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

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to access this client.')).toBeInTheDocument();
    });

    // Should NOT show client data
    expect(screen.queryByText('Full Client 1')).not.toBeInTheDocument();
  });

  it('should show client data for admin user', async () => {
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
      {
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        fullName: 'Full Client 1',
        folderId: 'folder123',
        active: true
      }
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

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Full Client 1')).toBeInTheDocument();
    });

    // Admin should see edit button
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('should show loading state while permissions are loading', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    // Mock a delayed permissions response
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              json: () => Promise.resolve({ success: true, permissions: [] })
            }), 100)
        )
      )
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      });

    render(<ClientPage />);

    // Should show loading state
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();
  });

  it('should show loading state while client data is loading', async () => {
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
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              ok: true,
              json: () => Promise.resolve({ clients: [] })
            }), 100)
        )
      );

    render(<ClientPage />);

    // Should show loading state for client data
    await waitFor(() => {
      expect(screen.getByText('Loading client data...')).toBeInTheDocument();
    });
  });

  it('should handle client not found error', async () => {
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

    // Mock clients response with different client code
    const mockClients = [
      {
        clientCode: 'CLIENT002', // Different client code
        clientName: 'Client 2',
        fullName: 'Full Client 2',
        folderId: 'folder456',
        active: true
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

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Client Not Found')).toBeInTheDocument();
      expect(screen.getByText('Client not found')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
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
      .mockRejectedValueOnce(new Error('API Error'));

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Client Not Found')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch client')).toBeInTheDocument();
    });
  });

  it('should show navigation during loading states', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              json: () => Promise.resolve({ success: true, permissions: [] })
            }), 100)
        )
      )
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      });

    render(<ClientPage />);

    // Should show navigation even during loading
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();
  });

  it('should show navigation during error states', async () => {
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
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: [] }) // Empty clients array
      });

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Client Not Found')).toBeInTheDocument();
    });
  });
});

