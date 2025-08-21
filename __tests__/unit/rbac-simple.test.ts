import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RBACService, rbacService, rbacUtils, ResourceType, ActionType, PermissionLevel } from '../../lib/rbac';

// Mock dependencies
jest.mock('../../lib/collections', () => ({
  permissionsService: {
    getByUser: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../lib/init', () => ({
  isFirebaseConfigured: jest.fn().mockReturnValue(true)
}));

describe('RBAC System - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear singleton instance for testing
    (RBACService as any).instance = undefined;
  });

  afterEach(() => {
    // Clear cache after each test
    rbacService.clearAllCache();
  });

  describe('RBACService - Admin Users', () => {
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

    it('should allow admin users all actions', async () => {
      const userId = 'admin123';
      const userRole = 'admin';

      const result = await rbacService.checkPermission(userId, userRole, 'users', 'delete');

      expect(result.allowed).toBe(true);
      expect(result.level).toBe('admin');
      expect(result.reason).toBe('User is admin');
    });

    it('should return admin permission level for any resource', async () => {
      const userId = 'admin123';
      const userRole = 'admin';

      const level = await rbacService.getResourcePermission(userId, userRole, 'clients');

      expect(level).toBe('admin');
    });

    it('should allow admin users to access any page', async () => {
      const userId = 'admin123';
      const userRole = 'admin';

      const canAccess = await rbacService.canAccessPage(userId, userRole, 'users');

      expect(canAccess).toBe(true);
    });
  });

  describe('RBACService - Basic Users', () => {
    it('should return basic permissions for basic users', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

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

    it('should deny access to restricted resources', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const result = await rbacService.checkPermission(userId, userRole, 'users', 'read');

      expect(result.allowed).toBe(false);
      expect(result.level).toBe('none');
      expect(result.reason).toContain('Insufficient permissions');
    });

    it('should allow access to permitted resources', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const result = await rbacService.checkPermission(userId, userRole, 'clients', 'read');

      expect(result.allowed).toBe(true);
      expect(result.level).toBe('read');
      expect(result.reason).toBe('Permission granted');
    });

    it('should deny write access to read-only resources', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const result = await rbacService.checkPermission(userId, userRole, 'clients', 'write');

      expect(result.allowed).toBe(false);
      expect(result.level).toBe('read');
      expect(result.reason).toContain('Insufficient permissions');
    });
  });

  describe('rbacUtils', () => {
    it('should check read permissions correctly', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const canRead = await rbacUtils.canRead(userId, userRole, 'clients');
      const cannotRead = await rbacUtils.canRead(userId, userRole, 'users');

      expect(canRead).toBe(true);
      expect(cannotRead).toBe(false);
    });

    it('should check write permissions correctly', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const canWrite = await rbacUtils.canWrite(userId, userRole, 'clients');
      const cannotWrite = await rbacUtils.canWrite(userId, userRole, 'users');

      expect(canWrite).toBe(false); // Basic users only have read access
      expect(cannotWrite).toBe(false);
    });

    it('should check create permissions correctly', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const canCreate = await rbacUtils.canCreate(userId, userRole, 'clients');
      const cannotCreate = await rbacUtils.canCreate(userId, userRole, 'users');

      expect(canCreate).toBe(false); // Basic users only have read access
      expect(cannotCreate).toBe(false);
    });

    it('should check delete permissions correctly', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const canDelete = await rbacUtils.canDelete(userId, userRole, 'clients');
      const cannotDelete = await rbacUtils.canDelete(userId, userRole, 'users');

      expect(canDelete).toBe(false); // Basic users only have read access
      expect(cannotDelete).toBe(false);
    });

    it('should check admin permissions correctly', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const isAdmin = await rbacUtils.isAdmin(userId, userRole, 'clients');
      const isNotAdmin = await rbacUtils.isAdmin(userId, userRole, 'users');

      expect(isAdmin).toBe(false);
      expect(isNotAdmin).toBe(false);
    });

    it('should return correct permission levels', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const clientsLevel = await rbacUtils.getPermissionLevel(userId, userRole, 'clients');
      const usersLevel = await rbacUtils.getPermissionLevel(userId, userRole, 'users');

      expect(clientsLevel).toBe('read');
      expect(usersLevel).toBe('none');
    });
  });

  describe('Permission Hierarchy', () => {
    it('should respect permission hierarchy for admin users', async () => {
      const userId = 'admin123';
      const userRole = 'admin';

      const canRead = await rbacUtils.canRead(userId, userRole, 'clients');
      const canWrite = await rbacUtils.canWrite(userId, userRole, 'clients');
      const canCreate = await rbacUtils.canCreate(userId, userRole, 'clients');
      const canDelete = await rbacUtils.canDelete(userId, userRole, 'clients');
      const isAdmin = await rbacUtils.isAdmin(userId, userRole, 'clients');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(canCreate).toBe(true);
      expect(canDelete).toBe(true);
      expect(isAdmin).toBe(true);
    });

    it('should respect permission hierarchy for basic users', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const canRead = await rbacUtils.canRead(userId, userRole, 'clients');
      const canWrite = await rbacUtils.canWrite(userId, userRole, 'clients');
      const canCreate = await rbacUtils.canCreate(userId, userRole, 'clients');
      const canDelete = await rbacUtils.canDelete(userId, userRole, 'clients');
      const isAdmin = await rbacUtils.isAdmin(userId, userRole, 'clients');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(false);
      expect(canCreate).toBe(false);
      expect(canDelete).toBe(false);
      expect(isAdmin).toBe(false);
    });
  });

  describe('Cache Management', () => {
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

  describe('Resource Types', () => {
    it('should handle all resource types', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const resources: ResourceType[] = ['users', 'permissions', 'audit', 'clients', 'files', 'folders', 'settings'];

      for (const resource of resources) {
        const level = await rbacService.getResourcePermission(userId, userRole, resource);
        expect(typeof level).toBe('string');
        expect(['admin', 'read', 'write', 'none']).toContain(level);
      }
    });

    it('should handle all action types', async () => {
      const userId = 'basic123';
      const userRole = 'basic';

      const actions: ActionType[] = ['read', 'write', 'delete', 'create', 'admin'];

      for (const action of actions) {
        const result = await rbacService.checkPermission(userId, userRole, 'clients', action);
        expect(typeof result.allowed).toBe('boolean');
        expect(typeof result.level).toBe('string');
        expect(typeof result.reason).toBe('string');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing userId gracefully', async () => {
      const userId = '';
      const userRole = 'basic';

      const permissions = await rbacService.getUserPermissions(userId, userRole);

      expect(permissions.userId).toBe('');
      expect(permissions.isAdmin).toBe(false);
    });

    it('should handle invalid user roles gracefully', async () => {
      const userId = 'test123';
      const userRole = 'invalid' as any;

      const permissions = await rbacService.getUserPermissions(userId, userRole);

      expect(permissions.userId).toBe(userId);
      expect(permissions.isAdmin).toBe(false);
    });
  });
});
