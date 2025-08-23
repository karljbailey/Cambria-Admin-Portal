import { permissionsService, permissionUtils } from '../../lib/permissions';
import { usersService } from '../../lib/collections';

// Mock the collections module
jest.mock('../../lib/collections', () => ({
  usersService: {
    getById: jest.fn(),
    addClientPermission: jest.fn(),
    removeClientPermission: jest.fn(),
    updateClientPermission: jest.fn(),
    getClientPermissions: jest.fn(),
    hasClientPermission: jest.fn(),
    update: jest.fn()
  }
}));

// Mock the Firebase module
jest.mock('../../lib/init', () => ({
  isFirebaseConfigured: jest.fn(() => true)
}));

const mockUsersService = usersService as jest.Mocked<typeof usersService>;

describe('PermissionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkClientPermission', () => {
    it('should return true for admin users regardless of client', async () => {
      const adminUser = {
        id: 'admin1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin' as const,
        status: 'active' as const,
        clientPermissions: []
      };

      mockUsersService.getById.mockResolvedValue(adminUser);
      mockUsersService.hasClientPermission.mockResolvedValue(true);

      const result = await permissionsService.checkClientPermission('admin1', 'CLIENT001', 'read');

      expect(result.hasPermission).toBe(true);
      expect(mockUsersService.hasClientPermission).toHaveBeenCalledWith('admin1', 'CLIENT001', 'read');
    });

    it('should return false for non-admin users without permissions', async () => {
      const regularUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'basic' as const,
        status: 'active' as const,
        clientPermissions: []
      };

      mockUsersService.getById.mockResolvedValue(regularUser);
      mockUsersService.hasClientPermission.mockResolvedValue(false);

      const result = await permissionsService.checkClientPermission('user1', 'CLIENT001', 'read');

      expect(result.hasPermission).toBe(false);
    });

    it('should return permission details for users with client access', async () => {
      const userWithPermission = {
        id: 'user1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'basic' as const,
        status: 'active' as const,
        clientPermissions: [
          {
            clientCode: 'CLIENT001',
            clientName: 'Test Client',
            permissionType: 'write' as const,
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      mockUsersService.getById.mockResolvedValue(userWithPermission);
      mockUsersService.hasClientPermission.mockResolvedValue(true);

      const result = await permissionsService.checkClientPermission('user1', 'CLIENT001', 'read');

      expect(result.hasPermission).toBe(true);
      expect(result.permissionType).toBe('write');
      expect(result.clientName).toBe('Test Client');
    });

    it('should handle errors gracefully', async () => {
      mockUsersService.getById.mockRejectedValue(new Error('Database error'));

      const result = await permissionsService.checkClientPermission('user1', 'CLIENT001', 'read');

      expect(result.hasPermission).toBe(false);
    });
  });

  describe('getUserClientPermissions', () => {
    it('should return user client permissions', async () => {
      const mockPermissions = [
        {
          clientCode: 'CLIENT001',
          clientName: 'Test Client 1',
          permissionType: 'read' as const,
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        },
        {
          clientCode: 'CLIENT002',
          clientName: 'Test Client 2',
          permissionType: 'write' as const,
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        }
      ];

      mockUsersService.getClientPermissions.mockResolvedValue(mockPermissions);

      const result = await permissionsService.getUserClientPermissions('user1');

      expect(result).toHaveLength(2);
      expect(result[0].clientCode).toBe('CLIENT001');
      expect(result[0].permissionType).toBe('read');
      expect(result[1].clientCode).toBe('CLIENT002');
      expect(result[1].permissionType).toBe('write');
    });

    it('should return empty array when user has no permissions', async () => {
      mockUsersService.getClientPermissions.mockResolvedValue([]);

      const result = await permissionsService.getUserClientPermissions('user1');

      expect(result).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockUsersService.getClientPermissions.mockRejectedValue(new Error('Database error'));

      const result = await permissionsService.getUserClientPermissions('user1');

      expect(result).toHaveLength(0);
    });
  });

  describe('addClientPermission', () => {
    it('should add client permission successfully', async () => {
      mockUsersService.addClientPermission.mockResolvedValue();

      const result = await permissionsService.addClientPermission(
        'user1',
        'CLIENT001',
        'Test Client',
        'write',
        'admin@test.com'
      );

      expect(result).toBe(true);
      expect(mockUsersService.addClientPermission).toHaveBeenCalledWith('user1', {
        clientCode: 'CLIENT001',
        clientName: 'Test Client',
        permissionType: 'write',
        grantedBy: 'admin@test.com',
        grantedAt: expect.any(Date)
      });
    });

    it('should handle errors gracefully', async () => {
      mockUsersService.addClientPermission.mockRejectedValue(new Error('Database error'));

      const result = await permissionsService.addClientPermission(
        'user1',
        'CLIENT001',
        'Test Client',
        'write',
        'admin@test.com'
      );

      expect(result).toBe(false);
    });
  });

  describe('removeClientPermission', () => {
    it('should remove client permission successfully', async () => {
      mockUsersService.removeClientPermission.mockResolvedValue();

      const result = await permissionsService.removeClientPermission('user1', 'CLIENT001');

      expect(result).toBe(true);
      expect(mockUsersService.removeClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001');
    });

    it('should handle errors gracefully', async () => {
      mockUsersService.removeClientPermission.mockRejectedValue(new Error('Database error'));

      const result = await permissionsService.removeClientPermission('user1', 'CLIENT001');

      expect(result).toBe(false);
    });
  });

  describe('updateClientPermission', () => {
    it('should update client permission successfully', async () => {
      mockUsersService.updateClientPermission.mockResolvedValue();

      const result = await permissionsService.updateClientPermission('user1', 'CLIENT001', 'admin');

      expect(result).toBe(true);
      expect(mockUsersService.updateClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001', 'admin');
    });

    it('should handle errors gracefully', async () => {
      mockUsersService.updateClientPermission.mockRejectedValue(new Error('Database error'));

      const result = await permissionsService.updateClientPermission('user1', 'CLIENT001', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('getAccessibleClients', () => {
    it('should return list of accessible client codes', async () => {
      const mockPermissions = [
        {
          clientCode: 'CLIENT001',
          clientName: 'Test Client 1',
          permissionType: 'read' as const,
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        },
        {
          clientCode: 'CLIENT002',
          clientName: 'Test Client 2',
          permissionType: 'write' as const,
          grantedBy: 'admin@test.com',
          grantedAt: new Date()
        }
      ];

      mockUsersService.getClientPermissions.mockResolvedValue(mockPermissions);

      const result = await permissionsService.getAccessibleClients('user1');

      expect(result).toEqual(['CLIENT001', 'CLIENT002']);
    });

    it('should return empty array when user has no permissions', async () => {
      mockUsersService.getClientPermissions.mockResolvedValue([]);

      const result = await permissionsService.getAccessibleClients('user1');

      expect(result).toEqual([]);
    });
  });

  describe('hasAnyClientAccess', () => {
    it('should return true for admin users', async () => {
      const adminUser = {
        id: 'admin1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin' as const,
        status: 'active' as const,
        clientPermissions: []
      };

      mockUsersService.getById.mockResolvedValue(adminUser);

      const result = await permissionsService.hasAnyClientAccess('admin1');

      expect(result).toBe(true);
    });

    it('should return true for users with client permissions', async () => {
      const userWithPermissions = {
        id: 'user1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'basic' as const,
        status: 'active' as const,
        clientPermissions: [
          {
            clientCode: 'CLIENT001',
            clientName: 'Test Client',
            permissionType: 'read' as const,
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      mockUsersService.getById.mockResolvedValue(userWithPermissions);

      const result = await permissionsService.hasAnyClientAccess('user1');

      expect(result).toBe(true);
    });

    it('should return false for users without permissions', async () => {
      const userWithoutPermissions = {
        id: 'user1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'basic' as const,
        status: 'active' as const,
        clientPermissions: []
      };

      mockUsersService.getById.mockResolvedValue(userWithoutPermissions);

      const result = await permissionsService.hasAnyClientAccess('user1');

      expect(result).toBe(false);
    });

    it('should return false for non-existent users', async () => {
      mockUsersService.getById.mockResolvedValue(null);

      const result = await permissionsService.hasAnyClientAccess('nonexistent');

      expect(result).toBe(false);
    });
  });
});

describe('permissionUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canReadClient', () => {
    it('should check read permission correctly', async () => {
      mockUsersService.hasClientPermission.mockResolvedValue(true);

      const result = await permissionUtils.canReadClient('user1', 'CLIENT001');

      expect(result).toBe(true);
      expect(mockUsersService.hasClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001', 'read');
    });
  });

  describe('canWriteClient', () => {
    it('should check write permission correctly', async () => {
      mockUsersService.hasClientPermission.mockResolvedValue(true);

      const result = await permissionUtils.canWriteClient('user1', 'CLIENT001');

      expect(result).toBe(true);
      expect(mockUsersService.hasClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001', 'write');
    });
  });

  describe('canAdminClient', () => {
    it('should check admin permission correctly', async () => {
      mockUsersService.hasClientPermission.mockResolvedValue(true);

      const result = await permissionUtils.canAdminClient('user1', 'CLIENT001');

      expect(result).toBe(true);
      expect(mockUsersService.hasClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001', 'admin');
    });
  });

  describe('getClientPermissionLevel', () => {
    it('should return permission level for user with access', async () => {
      const userWithPermission = {
        id: 'user1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'basic' as const,
        status: 'active' as const,
        clientPermissions: [
          {
            clientCode: 'CLIENT001',
            clientName: 'Test Client',
            permissionType: 'write' as const,
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      mockUsersService.getById.mockResolvedValue(userWithPermission);
      mockUsersService.hasClientPermission.mockResolvedValue(true);

      const result = await permissionUtils.getClientPermissionLevel('user1', 'CLIENT001');

      expect(result).toBe('write');
    });

    it('should return null for user without access', async () => {
      mockUsersService.hasClientPermission.mockResolvedValue(false);

      const result = await permissionUtils.getClientPermissionLevel('user1', 'CLIENT001');

      expect(result).toBe(null);
    });
  });
});


