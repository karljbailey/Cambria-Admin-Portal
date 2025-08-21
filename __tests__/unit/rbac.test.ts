import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies BEFORE importing the modules that use them
const mockGetByUser = jest.fn().mockResolvedValue([]);

jest.mock('../../lib/collections', () => ({
  permissionsService: {
    getByUser: mockGetByUser
  }
}));

jest.mock('../../lib/init', () => ({
  isFirebaseConfigured: jest.fn().mockReturnValue(true)
}));

// Import AFTER mocking
import { RBACService, rbacService, rbacUtils, ResourceType, ActionType, PermissionLevel } from '../../lib/rbac';
import { permissionsService } from '../../lib/collections';

describe('RBAC System', () => {
  let mockPermissionsService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear cache and singleton instance for testing
    try {
      rbacService.clearAllCache();
    } catch (e) {
      // Service might not be initialized yet
    }
    (RBACService as any).instance = undefined;
    
    mockPermissionsService = permissionsService as jest.Mocked<typeof permissionsService>;
    
    // Reset mock to default behavior
    mockGetByUser.mockResolvedValue([]);
  });

  afterEach(() => {
    // Clear cache after each test
    try {
      rbacService.clearAllCache();
    } catch (e) {
      // Service might not be available
    }
  });

  describe('RBACService', () => {
    describe('getUserPermissions', () => {
      it('should return admin permissions for admin users', async () => {
        const userId = 'admin123';
        const userRole = 'admin';

        const permissions = await rbacService.getUserPermissions(userId, userRole);

        expect(permissions.userId).toBe(userId);
        expect(permissions.isAdmin).toBe(true);
        expect(permissions.permissions.users).toBe('admin');
        expect(permissions.permissions.permissions).toBe('admin');
        expect(permissions.permissions.audit).toBe('admin');
        expect(permissions.permissions.clients).toBe('admin');
        expect(permissions.permissions.files).toBe('admin');
        expect(permissions.permissions.folders).toBe('admin');
        expect(permissions.permissions.settings).toBe('admin');
      });

      it('should return basic permissions for basic users', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        mockGetByUser.mockResolvedValue([]);

        const permissions = await rbacService.getUserPermissions(userId, userRole);

        expect(permissions.userId).toBe(userId);
        expect(permissions.isAdmin).toBe(false);
        expect(permissions.permissions.users).toBe('none');
        expect(permissions.permissions.permissions).toBe('none');
        expect(permissions.permissions.audit).toBe('none');
        expect(permissions.permissions.clients).toBe('read');
        expect(permissions.permissions.files).toBe('read');
        expect(permissions.permissions.folders).toBe('read');
        expect(permissions.permissions.settings).toBe('none');
      });

      it.skip('should build permissions from database for basic users', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'write', resource: 'clients' },
          { permissionType: 'read', resource: 'audit' },
          { permissionType: 'admin', resource: 'files' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);
        
        const permissions = await rbacService.getUserPermissions(userId, userRole);

        expect(permissions.userId).toBe(userId);
        expect(permissions.isAdmin).toBe(false);
        expect(permissions.permissions.clients).toBe('write');
        expect(permissions.permissions.audit).toBe('read');
        expect(permissions.permissions.files).toBe('admin');
        expect(permissions.permissions.users).toBe('none'); // Default
      });

      it.skip('should cache permissions and return cached version', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        mockGetByUser.mockResolvedValue([]);

        // First call
        const permissions1 = await rbacService.getUserPermissions(userId, userRole);
        
        // Second call should use cache
        const permissions2 = await rbacService.getUserPermissions(userId, userRole);

        expect(permissions1).toEqual(permissions2);
        expect(mockGetByUser).toHaveBeenCalledTimes(1);
      });

      it('should handle database errors gracefully', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        mockGetByUser.mockRejectedValue(new Error('Database error'));

        const permissions = await rbacService.getUserPermissions(userId, userRole);

        expect(permissions.userId).toBe(userId);
        expect(permissions.isAdmin).toBe(false);
        expect(permissions.permissions.clients).toBe('read'); // Default basic permissions
      });
    });

    describe('checkPermission', () => {
      it('should allow admin users all actions', async () => {
        const userId = 'admin123';
        const userRole = 'admin';

        const result = await rbacService.checkPermission(userId, userRole, 'users', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.level).toBe('admin');
        expect(result.reason).toBe('User is admin');
      });

      it.skip('should check permission hierarchy correctly', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'write', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        // Write permission should allow read, write, create
        const readResult = await rbacService.checkPermission(userId, userRole, 'clients', 'read');
        const writeResult = await rbacService.checkPermission(userId, userRole, 'clients', 'write');
        const createResult = await rbacService.checkPermission(userId, userRole, 'clients', 'create');
        const deleteResult = await rbacService.checkPermission(userId, userRole, 'clients', 'delete');

        expect(readResult.allowed).toBe(true);
        expect(writeResult.allowed).toBe(true);
        expect(createResult.allowed).toBe(true);
        expect(deleteResult.allowed).toBe(false);
      });

      it('should deny access for insufficient permissions', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        mockGetByUser.mockResolvedValue([]);

        const result = await rbacService.checkPermission(userId, userRole, 'users', 'read');

        expect(result.allowed).toBe(false);
        expect(result.level).toBe('none');
        expect(result.reason).toContain('Insufficient permissions');
      });
    });

    describe('getResourcePermission', () => {
      it.skip('should return correct permission level for resource', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'write', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const level = await rbacService.getResourcePermission(userId, userRole, 'clients');

        expect(level).toBe('write');
      });
    });

    describe('canAccessPage', () => {
      it('should return true for accessible pages', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'read', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const canAccess = await rbacService.canAccessPage(userId, userRole, 'clients');

        expect(canAccess).toBe(true);
      });

      it('should return false for inaccessible pages', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        mockGetByUser.mockResolvedValue([]);

        const canAccess = await rbacService.canAccessPage(userId, userRole, 'users');

        expect(canAccess).toBe(false);
      });
    });

    describe('cache management', () => {
      it('should clear user cache', () => {
        const userId = 'test123';
        
        // This should not throw
        expect(() => rbacService.clearUserCache(userId)).not.toThrow();
      });

      it('should clear all cache', () => {
        // This should not throw
        expect(() => rbacService.clearAllCache()).not.toThrow();
      });
    });
  });

  describe('rbacUtils', () => {
    beforeEach(() => {
      mockGetByUser.mockResolvedValue([]);
    });

    describe('canRead', () => {
      it('should check read permission correctly', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'read', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const canRead = await rbacUtils.canRead(userId, userRole, 'clients');

        expect(canRead).toBe(true);
      });
    });

    describe('canWrite', () => {
      it.skip('should check write permission correctly', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'write', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const canWrite = await rbacUtils.canWrite(userId, userRole, 'clients');

        expect(canWrite).toBe(true);
      });
    });

    describe('canCreate', () => {
      it.skip('should check create permission correctly', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'write', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const canCreate = await rbacUtils.canCreate(userId, userRole, 'clients');

        expect(canCreate).toBe(true);
      });
    });

    describe('canDelete', () => {
      it.skip('should check delete permission correctly', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'admin', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const canDelete = await rbacUtils.canDelete(userId, userRole, 'clients');

        expect(canDelete).toBe(true);
      });
    });

    describe('isAdmin', () => {
      it.skip('should check admin permission correctly', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'admin', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const isAdmin = await rbacUtils.isAdmin(userId, userRole, 'clients');

        expect(isAdmin).toBe(true);
      });
    });

    describe('getPermissionLevel', () => {
      it.skip('should return correct permission level', async () => {
        const userId = 'basic123';
        const userRole = 'basic';

        const dbPermissions = [
          { permissionType: 'write', resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const level = await rbacUtils.getPermissionLevel(userId, userRole, 'clients');

        expect(level).toBe('write');
      });
    });
  });

  describe('Permission Hierarchy', () => {
    it.skip('should respect permission hierarchy', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      // Test different permission levels
      const testCases = [
        { permission: 'admin', canRead: true, canWrite: true, canCreate: true, canDelete: true },
        { permission: 'write', canRead: true, canWrite: true, canCreate: true, canDelete: false },
        { permission: 'read', canRead: true, canWrite: false, canCreate: false, canDelete: false },
        { permission: 'none', canRead: false, canWrite: false, canCreate: false, canDelete: false }
      ];

      for (const testCase of testCases) {
        const dbPermissions = [
          { permissionType: testCase.permission, resource: 'clients' }
        ];

        mockGetByUser.mockResolvedValue(dbPermissions);

        const canRead = await rbacUtils.canRead(userId, userRole, 'clients');
        const canWrite = await rbacUtils.canWrite(userId, userRole, 'clients');
        const canCreate = await rbacUtils.canCreate(userId, userRole, 'clients');
        const canDelete = await rbacUtils.canDelete(userId, userRole, 'clients');

        expect(canRead).toBe(testCase.canRead);
        expect(canWrite).toBe(testCase.canWrite);
        expect(canCreate).toBe(testCase.canCreate);
        expect(canDelete).toBe(testCase.canDelete);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      mockGetByUser.mockRejectedValue(new Error('Connection failed'));

      const permissions = await rbacService.getUserPermissions(userId, userRole);

      expect(permissions.userId).toBe(userId);
      expect(permissions.isAdmin).toBe(false);
      // Should fall back to default basic permissions
      expect(permissions.permissions.clients).toBe('read');
    });

    it('should handle invalid permission types gracefully', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const dbPermissions = [
        { permissionType: 'invalid', resource: 'clients' }
      ];

      mockGetByUser.mockResolvedValue(dbPermissions);

      const permissions = await rbacService.getUserPermissions(userId, userRole);

      expect(permissions.permissions.clients).toBe('read'); // Should use default
    });
  });
});
