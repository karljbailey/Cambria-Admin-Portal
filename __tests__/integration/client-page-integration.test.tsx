import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Client Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should complete full flow: auth -> permissions -> client data -> display', async () => {
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

    const mockFolderData = {
      items: [
        {
          id: 'folder1',
          name: '2024-01',
          mimeType: 'application/vnd.google-apps.folder',
          webViewLink: 'https://drive.google.com/folder1'
        }
      ]
    };

    // Mock the complete API call sequence
    (fetch as jest.Mock)
      // Auth session
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      // Permissions
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      // Admin status check
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      // Clients
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      })
      // Folder data
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFolderData)
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

    // Should show edit button (write permission)
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    // Should show navigation
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Verify API call sequence
    expect(fetch).toHaveBeenCalledTimes(5);
    const calls = (fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('/api/auth/session'); // Auth
    expect(calls[1][0]).toBe('/api/permissions/client?userId=test-user-123'); // Permissions
    expect(calls[2][0]).toBe('/api/auth/session'); // Admin check
    expect(calls[3][0]).toBe('/api/clients'); // Clients
    expect(calls[4][0]).toBe('/api/folder/folder123'); // Folder data
  });

  it('should handle permission-based UI rendering correctly', async () => {
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
        permissionType: 'read', // Read-only permission
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
      });

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Full Client 1')).toBeInTheDocument();
    });

    // Should NOT show edit button (read-only permission)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();

    // Should show client status
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should handle admin user with full access', async () => {
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
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

  it('should handle permission denial gracefully', async () => {
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

    // Should show navigation
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Should show "Try Again" button for permission errors
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should handle client not found scenario', async () => {
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

    // Mock clients with different client code
    const mockClients = [
      {
        clientCode: 'CLIENT002', // Different client
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

    // Should show navigation
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Should NOT show "Try Again" button for client not found
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
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
      .mockRejectedValueOnce(new Error('Network error'));

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Client Not Found')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch client')).toBeInTheDocument();
    });

    // Should show navigation
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should show seamless loading experience', async () => {
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

    // Mock delayed responses to test loading states
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              json: () => Promise.resolve({ success: true, permissions: mockPermissions })
            }), 50)
        )
      )
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              ok: true,
              json: () => Promise.resolve({ clients: mockClients })
            }), 50)
        )
      )
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
      });

    render(<ClientPage />);

    // Should show navigation immediately
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Should show loading states
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();

    // Wait for permissions to load
    await waitFor(() => {
      expect(screen.getByText('Loading client data...')).toBeInTheDocument();
    });

    // Wait for client data to load
    await waitFor(() => {
      expect(screen.getByText('Full Client 1')).toBeInTheDocument();
    });

    // Should not show loading states anymore
    expect(screen.queryByText('Loading permissions...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading client data...')).not.toBeInTheDocument();
  });
});

