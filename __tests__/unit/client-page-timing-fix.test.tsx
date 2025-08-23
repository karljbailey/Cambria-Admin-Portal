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

describe('Client Page Timing Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should wait for permissions to load before fetching client data', async () => {
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

    // Mock delayed permissions response to simulate loading
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              json: () => Promise.resolve({ success: true, permissions: mockPermissions })
            }), 100)
        )
      )
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

    // Should show loading state for permissions first
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();

    // Wait for permissions to load
    await waitFor(() => {
      expect(screen.getByText('Loading client data...')).toBeInTheDocument();
    });

    // Wait for client data to load
    await waitFor(() => {
      expect(screen.getByText('Full Client 1')).toBeInTheDocument();
    });

    // Verify the correct sequence of API calls
    expect(fetch).toHaveBeenCalledTimes(5);
    const calls = (fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('/api/auth/session'); // Auth
    expect(calls[1][0]).toBe('/api/permissions/client?userId=test-user-123'); // Permissions
    expect(calls[2][0]).toBe('/api/auth/session'); // Admin check
    expect(calls[3][0]).toBe('/api/clients'); // Clients (only after permissions loaded)
    expect(calls[4][0]).toBe('/api/folder/folder123'); // Folder data
  });

  it('should not fetch client data while permissions are still loading', async () => {
    const mockAuthSession = {
      authenticated: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
      }
    };

    // Mock a very slow permissions response
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve({
              json: () => Promise.resolve({ success: true, permissions: [] })
            }), 500) // Very slow response
        )
      )
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      });

    render(<ClientPage />);

    // Should show loading state for permissions
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();

    // Wait a bit but not long enough for permissions to load
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should still be loading permissions and NOT have called clients API
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3); // Only auth, permissions, and admin check
    expect(fetch).not.toHaveBeenCalledWith('/api/clients');
  });

  it('should fetch client data immediately after permissions finish loading', async () => {
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

    let permissionsResolve: (value: any) => void;
    const permissionsPromise = new Promise(resolve => {
      permissionsResolve = resolve;
    });

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockAuthSession)
      })
      .mockImplementationOnce(() => permissionsPromise)
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

    // Should show loading state for permissions
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();

    // Resolve permissions
    permissionsResolve!({
      json: () => Promise.resolve({ success: true, permissions: mockPermissions })
    });

    // Wait for the transition to client data loading
    await waitFor(() => {
      expect(screen.getByText('Loading client data...')).toBeInTheDocument();
    });

    // Should have called clients API immediately after permissions resolved
    expect(fetch).toHaveBeenCalledWith('/api/clients');
  });
});


