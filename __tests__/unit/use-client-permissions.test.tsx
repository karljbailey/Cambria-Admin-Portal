import { renderHook, waitFor } from '@testing-library/react';
import { useClientPermissions } from '../../lib/hooks/useClientPermissions';

// Mock fetch
global.fetch = jest.fn();

describe('useClientPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with default values when no userId is provided', () => {
    const { result } = renderHook(() => useClientPermissions());

    expect(result.current.userPermissions).toEqual([]);
    expect(result.current.accessibleClients).toEqual([]);
    expect(result.current.hasAnyClientAccess).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('should fetch user permissions when userId is provided', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Test Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      }
    ];

    const mockUser = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'basic'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('user1'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userPermissions).toEqual(mockPermissions);
    expect(result.current.accessibleClients).toEqual(['CLIENT001', 'CLIENT002']);
    expect(result.current.hasAnyClientAccess).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle admin users correctly', async () => {
    const mockUser = {
      id: 'admin1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('admin1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.hasAnyClientAccess).toBe(true);
  });

  it('should check read permissions correctly', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      }
    ];

    const mockUser = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'basic'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // User should be able to read CLIENT001
    expect(result.current.canReadClient('CLIENT001')).toBe(true);
    
    // User should not be able to read CLIENT002
    expect(result.current.canReadClient('CLIENT002')).toBe(false);
    
    // Admin should be able to read any client
    expect(result.current.canReadClient('ANY_CLIENT')).toBe(false); // Not admin in this case
  });

  it('should check write permissions correctly', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Test Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      }
    ];

    const mockUser = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'basic'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // User should not be able to write to CLIENT001 (read only)
    expect(result.current.canWriteClient('CLIENT001')).toBe(false);
    
    // User should be able to write to CLIENT002 (write permission)
    expect(result.current.canWriteClient('CLIENT002')).toBe(true);
    
    // User should not be able to write to CLIENT003 (no permission)
    expect(result.current.canWriteClient('CLIENT003')).toBe(false);
  });

  it('should check admin permissions correctly', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'admin',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Test Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      }
    ];

    const mockUser = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'basic'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // User should be able to admin CLIENT001
    expect(result.current.canAdminClient('CLIENT001')).toBe(true);
    
    // User should not be able to admin CLIENT002 (write only)
    expect(result.current.canAdminClient('CLIENT002')).toBe(false);
    
    // User should not be able to admin CLIENT003 (no permission)
    expect(result.current.canAdminClient('CLIENT003')).toBe(false);
  });

  it('should get permission level correctly', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Test Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT003',
        clientName: 'Test Client 3',
        permissionType: 'admin',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-03'),
        expiresAt: undefined
      }
    ];

    const mockUser = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'basic'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getClientPermissionLevel('CLIENT001')).toBe('read');
    expect(result.current.getClientPermissionLevel('CLIENT002')).toBe('write');
    expect(result.current.getClientPermissionLevel('CLIENT003')).toBe('admin');
    expect(result.current.getClientPermissionLevel('CLIENT004')).toBe(null);
  });

  it('should filter clients by permission correctly', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      },
      {
        clientCode: 'CLIENT002',
        clientName: 'Test Client 2',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-02'),
        expiresAt: undefined
      }
    ];

    const mockUser = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'basic'
    };

    const allClients = [
      { clientCode: 'CLIENT001', name: 'Client 1' },
      { clientCode: 'CLIENT002', name: 'Client 2' },
      { clientCode: 'CLIENT003', name: 'Client 3' }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const filteredClients = result.current.filterClientsByPermission(allClients);
    expect(filteredClients).toHaveLength(2);
    expect(filteredClients.map(c => c.clientCode)).toEqual(['CLIENT001', 'CLIENT002']);
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch permissions');
    expect(result.current.userPermissions).toEqual([]);
    expect(result.current.accessibleClients).toEqual([]);
    expect(result.current.hasAnyClientAccess).toBe(false);
  });

  it('should handle failed API responses', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Permission denied' })
    });

    const { result } = renderHook(() => useClientPermissions('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.userPermissions).toEqual([]);
    expect(result.current.accessibleClients).toEqual([]);
    expect(result.current.hasAnyClientAccess).toBe(false);
  });

  it('should handle admin users having access to all clients', async () => {
    const mockUser = {
      id: 'admin1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, user: mockUser })
      });

    const { result } = renderHook(() => useClientPermissions('admin1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Admin should have access to any client
    expect(result.current.canReadClient('ANY_CLIENT')).toBe(true);
    expect(result.current.canWriteClient('ANY_CLIENT')).toBe(true);
    expect(result.current.canAdminClient('ANY_CLIENT')).toBe(true);
    expect(result.current.getClientPermissionLevel('ANY_CLIENT')).toBe('admin');

    // Admin should see all clients when filtering
    const allClients = [
      { clientCode: 'CLIENT001', name: 'Client 1' },
      { clientCode: 'CLIENT002', name: 'Client 2' }
    ];
    const filteredClients = result.current.filterClientsByPermission(allClients);
    expect(filteredClients).toEqual(allClients);
  });
});

