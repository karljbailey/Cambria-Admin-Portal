import { permissionsService } from '../../lib/permissions';

// Mock the usersService
jest.mock('../../lib/collections', () => ({
  usersService: {
    getById: jest.fn(),
    update: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    query: jest.fn(),
    addClientPermission: jest.fn(),
    removeClientPermission: jest.fn(),
    updateClientPermission: jest.fn(),
    getClientPermissions: jest.fn(),
    hasClientPermission: jest.fn()
  },
  isFirebaseConfigured: jest.fn(() => true)
}));

describe('Permissions API Debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle user with no permissions', async () => {
    const { usersService } = require('../../lib/collections');
    
    // Mock user with no permissions
    usersService.getById.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'basic',
      status: 'active',
      clientPermissions: []
    });

    const result = await permissionsService.getUserClientPermissions('user123');
    
    expect(result).toEqual([]);
    expect(usersService.getById).toHaveBeenCalledWith('user123');
  });

  it('should handle user with permissions', async () => {
    const { usersService } = require('../../lib/collections');
    
    // Mock user with permissions
    usersService.getById.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'basic',
      status: 'active',
      clientPermissions: [
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
      ]
    });

    const result = await permissionsService.getUserClientPermissions('user123');
    
    expect(result).toHaveLength(2);
    expect(result[0].clientCode).toBe('CLIENT001');
    expect(result[1].clientCode).toBe('CLIENT002');
    expect(usersService.getById).toHaveBeenCalledWith('user123');
  });

  it('should handle non-existent user', async () => {
    const { usersService } = require('../../lib/collections');
    
    // Mock non-existent user
    usersService.getById.mockResolvedValue(null);

    const result = await permissionsService.getUserClientPermissions('nonexistent');
    
    expect(result).toEqual([]);
    expect(usersService.getById).toHaveBeenCalledWith('nonexistent');
  });

  it('should handle admin user correctly', async () => {
    const { usersService } = require('../../lib/collections');
    
    // Mock admin user
    usersService.getById.mockResolvedValue({
      id: 'admin123',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin',
      status: 'active',
      clientPermissions: []
    });

    // Admin should have access to any client
    const canRead = await permissionsService.checkClientPermission('admin123', 'ANY_CLIENT', 'read');
    const canWrite = await permissionsService.checkClientPermission('admin123', 'ANY_CLIENT', 'write');
    const canAdmin = await permissionsService.checkClientPermission('admin123', 'ANY_CLIENT', 'admin');
    
    expect(canRead.success).toBe(true);
    expect(canWrite.success).toBe(true);
    expect(canAdmin.success).toBe(true);
    expect(canRead.hasPermission).toBe(true);
    expect(canWrite.hasPermission).toBe(true);
    expect(canAdmin.hasPermission).toBe(true);
  });

  it('should check specific client permissions correctly', async () => {
    const { usersService } = require('../../lib/collections');
    
    // Mock user with specific permissions
    usersService.getById.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'basic',
      status: 'active',
      clientPermissions: [
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
      ]
    });

    // Test CLIENT001 permissions
    const client1Read = await permissionsService.checkClientPermission('user123', 'CLIENT001', 'read');
    const client1Write = await permissionsService.checkClientPermission('user123', 'CLIENT001', 'write');
    
    expect(client1Read.success).toBe(true);
    expect(client1Read.hasPermission).toBe(true);
    expect(client1Write.success).toBe(true);
    expect(client1Write.hasPermission).toBe(false); // read permission doesn't grant write

    // Test CLIENT002 permissions
    const client2Read = await permissionsService.checkClientPermission('user123', 'CLIENT002', 'read');
    const client2Write = await permissionsService.checkClientPermission('user123', 'CLIENT002', 'write');
    
    expect(client2Read.success).toBe(true);
    expect(client2Read.hasPermission).toBe(true); // write permission grants read
    expect(client2Write.success).toBe(true);
    expect(client2Write.hasPermission).toBe(true);

    // Test CLIENT003 (no permission)
    const client3Read = await permissionsService.checkClientPermission('user123', 'CLIENT003', 'read');
    expect(client3Read.success).toBe(true);
    expect(client3Read.hasPermission).toBe(false);
  });

  it('should handle permission hierarchy correctly', async () => {
    const { usersService } = require('../../lib/collections');
    
    // Mock user with admin permission for one client
    usersService.getById.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'basic',
      status: 'active',
      clientPermissions: [
        {
          clientCode: 'CLIENT001',
          clientName: 'Test Client 1',
          permissionType: 'admin',
          grantedBy: 'admin@test.com',
          grantedAt: new Date('2024-01-01'),
          expiresAt: undefined
        }
      ]
    });

    // Admin permission should grant all lower permissions
    const canRead = await permissionsService.checkClientPermission('user123', 'CLIENT001', 'read');
    const canWrite = await permissionsService.checkClientPermission('user123', 'CLIENT001', 'write');
    const canAdmin = await permissionsService.checkClientPermission('user123', 'CLIENT001', 'admin');
    
    expect(canRead.hasPermission).toBe(true);
    expect(canWrite.hasPermission).toBe(true);
    expect(canAdmin.hasPermission).toBe(true);
  });
});


