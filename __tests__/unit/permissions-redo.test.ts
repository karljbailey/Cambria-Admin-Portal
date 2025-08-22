import { permissionsService } from '../../lib/permissions';
import { usersService } from '../../lib/collections';

// Mock Firebase
jest.mock('../../lib/firebase', () => ({
  addDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getDocumentById: jest.fn(),
  getAllDocuments: jest.fn(),
  queryDocuments: jest.fn(),
}));

describe('Permissions Redo - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin User Access', () => {
    it('should grant admin users access to all clients', async () => {
      // Mock admin user
      const adminUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        status: 'active',
        clientPermissions: []
      };

      jest.spyOn(usersService, 'getById').mockResolvedValue(adminUser as any);

      // Test admin access to any client
      const result1 = await permissionsService.checkClientPermission('admin-123', 'CAM', 'read');
      const result2 = await permissionsService.checkClientPermission('admin-123', 'TEST', 'write');
      const result3 = await permissionsService.checkClientPermission('admin-123', 'DEMO', 'admin');

      expect(result1.hasPermission).toBe(true);
      expect(result2.hasPermission).toBe(true);
      expect(result3.hasPermission).toBe(true);
    });
  });

  describe('Basic User Access', () => {
    it('should only grant access to clients with explicit permissions', async () => {
      // Mock basic user with specific permissions
      const basicUser = {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Basic User',
        role: 'basic',
        status: 'active',
        clientPermissions: [
          {
            clientCode: 'CAM',
            clientName: 'Cambria',
            permissionType: 'read',
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      jest.spyOn(usersService, 'getById').mockResolvedValue(basicUser as any);

      // Test access to permitted client
      const permittedResult = await permissionsService.checkClientPermission('user-123', 'CAM', 'read');
      expect(permittedResult.hasPermission).toBe(true);
      expect(permittedResult.permissionType).toBe('read');

      // Test access to non-permitted client
      const deniedResult = await permissionsService.checkClientPermission('user-123', 'TEST', 'read');
      expect(deniedResult.hasPermission).toBe(false);
    });

    it('should enforce permission hierarchy', async () => {
      // Mock user with read permission
      const readUser = {
        id: 'read-user',
        email: 'read@test.com',
        name: 'Read User',
        role: 'basic',
        status: 'active',
        clientPermissions: [
          {
            clientCode: 'CAM',
            clientName: 'Cambria',
            permissionType: 'read',
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      jest.spyOn(usersService, 'getById').mockResolvedValue(readUser as any);

      // Read permission should work
      const readResult = await permissionsService.checkClientPermission('read-user', 'CAM', 'read');
      expect(readResult.hasPermission).toBe(true);

      // Write permission should be denied
      const writeResult = await permissionsService.checkClientPermission('read-user', 'CAM', 'write');
      expect(writeResult.hasPermission).toBe(false);

      // Admin permission should be denied
      const adminResult = await permissionsService.checkClientPermission('read-user', 'CAM', 'admin');
      expect(adminResult.hasPermission).toBe(false);
    });

    it('should allow higher permissions to access lower levels', async () => {
      // Mock user with admin permission
      const adminClientUser = {
        id: 'admin-client-user',
        email: 'adminclient@test.com',
        name: 'Admin Client User',
        role: 'basic',
        status: 'active',
        clientPermissions: [
          {
            clientCode: 'CAM',
            clientName: 'Cambria',
            permissionType: 'admin',
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      jest.spyOn(usersService, 'getById').mockResolvedValue(adminClientUser as any);

      // Admin permission should allow all access levels
      const readResult = await permissionsService.checkClientPermission('admin-client-user', 'CAM', 'read');
      const writeResult = await permissionsService.checkClientPermission('admin-client-user', 'CAM', 'write');
      const adminResult = await permissionsService.checkClientPermission('admin-client-user', 'CAM', 'admin');

      expect(readResult.hasPermission).toBe(true);
      expect(writeResult.hasPermission).toBe(true);
      expect(adminResult.hasPermission).toBe(true);
    });
  });

  describe('Exact Client Code Matching', () => {
    it('should require exact client code matches', async () => {
      // Mock user with CAM permission
      const user = {
        id: 'user-123',
        email: 'user@test.com',
        name: 'Test User',
        role: 'basic',
        status: 'active',
        clientPermissions: [
          {
            clientCode: 'CAM',
            clientName: 'Cambria',
            permissionType: 'read',
            grantedBy: 'admin@test.com',
            grantedAt: new Date()
          }
        ]
      };

      jest.spyOn(usersService, 'getById').mockResolvedValue(user as any);

      // Exact match should work
      const exactMatch = await permissionsService.checkClientPermission('user-123', 'CAM', 'read');
      expect(exactMatch.hasPermission).toBe(true);

      // Different case should not work
      const differentCase = await permissionsService.checkClientPermission('user-123', 'cam', 'read');
      expect(differentCase.hasPermission).toBe(false);

      // Different client should not work
      const differentClient = await permissionsService.checkClientPermission('user-123', 'CAM2', 'read');
      expect(differentClient.hasPermission).toBe(false);
    });
  });

  describe('User Not Found', () => {
    it('should deny access for non-existent users', async () => {
      jest.spyOn(usersService, 'getById').mockResolvedValue(null);

      const result = await permissionsService.checkClientPermission('non-existent', 'CAM', 'read');
      expect(result.hasPermission).toBe(false);
    });
  });
});
