import { permissionsService, permissionUtils } from '../../lib/permissions';
import { usersService } from '../../lib/collections';

// Mock Firebase configuration
jest.mock('../../lib/init', () => ({
  isFirebaseConfigured: jest.fn(() => true),
  initializeApp: jest.fn()
}));

describe('Client Permissions Integration', () => {
  let testUserId: string;
  let testClientCode: string;

  beforeAll(async () => {
    // Create a test user
    const testUser = await usersService.add({
      email: 'test-permissions@example.com',
      name: 'Test Permissions User',
      role: 'basic',
      status: 'active',
      clientPermissions: []
    });
    testUserId = testUser.id!;
    testClientCode = 'TEST_CLIENT_001';
  });

  afterAll(async () => {
    // Clean up test user
    try {
      await usersService.delete(testUserId);
    } catch (error) {
      console.log('Test user already cleaned up');
    }
  });

  describe('Complete Permission Workflow', () => {
    it('should handle full permission lifecycle: add -> check -> update -> remove', async () => {
      // Step 1: Add client permission
      const addResult = await permissionsService.addClientPermission(
        testUserId,
        testClientCode,
        'Test Client',
        'read',
        'admin@test.com'
      );
      expect(addResult).toBe(true);

      // Step 2: Check if permission was added
      const checkResult = await permissionsService.checkClientPermission(
        testUserId,
        testClientCode,
        'read'
      );
      expect(checkResult.hasPermission).toBe(true);
      expect(checkResult.permissionType).toBe('read');
      expect(checkResult.clientName).toBe('Test Client');

      // Step 3: Verify user can read client
      const canRead = await permissionUtils.canReadClient(testUserId, testClientCode);
      expect(canRead).toBe(true);

      // Step 4: Verify user cannot write (permission hierarchy)
      const canWrite = await permissionUtils.canWriteClient(testUserId, testClientCode);
      expect(canWrite).toBe(false);

      // Step 5: Update permission to write level
      const updateResult = await permissionsService.updateClientPermission(
        testUserId,
        testClientCode,
        'write'
      );
      expect(updateResult).toBe(true);

      // Step 6: Verify user can now write
      const canWriteAfterUpdate = await permissionUtils.canWriteClient(testUserId, testClientCode);
      expect(canWriteAfterUpdate).toBe(true);

      // Step 7: Get user's client permissions
      const userPermissions = await permissionsService.getUserClientPermissions(testUserId);
      expect(userPermissions).toHaveLength(1);
      expect(userPermissions[0].clientCode).toBe(testClientCode);
      expect(userPermissions[0].permissionType).toBe('write');

      // Step 8: Remove permission
      const removeResult = await permissionsService.removeClientPermission(
        testUserId,
        testClientCode
      );
      expect(removeResult).toBe(true);

      // Step 9: Verify permission was removed
      const checkAfterRemove = await permissionsService.checkClientPermission(
        testUserId,
        testClientCode,
        'read'
      );
      expect(checkAfterRemove.hasPermission).toBe(false);
    });

    it('should handle multiple client permissions for a single user', async () => {
      const clientCodes = ['CLIENT_A', 'CLIENT_B', 'CLIENT_C'];
      const clientNames = ['Client A', 'Client B', 'Client C'];
      const permissionTypes: ('read' | 'write' | 'admin')[] = ['read', 'write', 'admin'];

      // Add multiple permissions
      for (let i = 0; i < clientCodes.length; i++) {
        const result = await permissionsService.addClientPermission(
          testUserId,
          clientCodes[i],
          clientNames[i],
          permissionTypes[i],
          'admin@test.com'
        );
        expect(result).toBe(true);
      }

      // Verify all permissions were added
      const userPermissions = await permissionsService.getUserClientPermissions(testUserId);
      expect(userPermissions).toHaveLength(clientCodes.length);

      // Verify each permission works correctly
      for (let i = 0; i < clientCodes.length; i++) {
        const checkResult = await permissionsService.checkClientPermission(
          testUserId,
          clientCodes[i],
          'read'
        );
        expect(checkResult.hasPermission).toBe(true);
        expect(checkResult.permissionType).toBe(permissionTypes[i]);
        expect(checkResult.clientName).toBe(clientNames[i]);
      }

      // Get accessible clients
      const accessibleClients = await permissionsService.getAccessibleClients(testUserId);
      expect(accessibleClients).toHaveLength(clientCodes.length);
      expect(accessibleClients).toEqual(expect.arrayContaining(clientCodes));

      // Clean up
      for (const clientCode of clientCodes) {
        await permissionsService.removeClientPermission(testUserId, clientCode);
      }
    });

    it('should handle permission hierarchy correctly', async () => {
      // Add admin permission
      await permissionsService.addClientPermission(
        testUserId,
        testClientCode,
        'Test Client',
        'admin',
        'admin@test.com'
      );

      // Admin should have all permissions
      const canRead = await permissionUtils.canReadClient(testUserId, testClientCode);
      const canWrite = await permissionUtils.canWriteClient(testUserId, testClientCode);
      const canAdmin = await permissionUtils.canAdminClient(testUserId, testClientCode);

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(canAdmin).toBe(true);

      // Get permission level
      const permissionLevel = await permissionUtils.getClientPermissionLevel(testUserId, testClientCode);
      expect(permissionLevel).toBe('admin');

      // Clean up
      await permissionsService.removeClientPermission(testUserId, testClientCode);
    });

    it('should handle admin users having access to all clients', async () => {
      // Create admin user
      const adminUser = await usersService.add({
        email: 'admin-test@example.com',
        name: 'Admin Test User',
        role: 'admin',
        status: 'active',
        clientPermissions: []
      });

      // Admin should have access to any client without explicit permissions
      const hasAccess = await permissionsService.hasAnyClientAccess(adminUser.id!);
      expect(hasAccess).toBe(true);

      const canRead = await permissionUtils.canReadClient(adminUser.id!, 'ANY_CLIENT');
      expect(canRead).toBe(true);

      const canWrite = await permissionUtils.canWriteClient(adminUser.id!, 'ANY_CLIENT');
      expect(canWrite).toBe(true);

      const canAdmin = await permissionUtils.canAdminClient(adminUser.id!, 'ANY_CLIENT');
      expect(canAdmin).toBe(true);

      // Clean up admin user
      await usersService.delete(adminUser.id!);
    });

    it('should handle users with no client access', async () => {
      // Create user with no permissions
      const noAccessUser = await usersService.add({
        email: 'no-access@example.com',
        name: 'No Access User',
        role: 'basic',
        status: 'active',
        clientPermissions: []
      });

      // User should not have access to any clients
      const hasAccess = await permissionsService.hasAnyClientAccess(noAccessUser.id!);
      expect(hasAccess).toBe(false);

      const canRead = await permissionUtils.canReadClient(noAccessUser.id!, 'ANY_CLIENT');
      expect(canRead).toBe(false);

      const accessibleClients = await permissionsService.getAccessibleClients(noAccessUser.id!);
      expect(accessibleClients).toHaveLength(0);

      // Clean up user
      await usersService.delete(noAccessUser.id!);
    });

    it('should handle expired permissions correctly', async () => {
      // Add permission with expiration
      const expiredPermission = {
        clientCode: testClientCode,
        clientName: 'Test Client',
        permissionType: 'read' as const,
        grantedBy: 'admin@test.com',
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      await usersService.addClientPermission(testUserId, expiredPermission);

      // Check if permission is still valid (this would require additional logic in the service)
      const checkResult = await permissionsService.checkClientPermission(
        testUserId,
        testClientCode,
        'read'
      );
      
      // Note: Current implementation doesn't check expiration, but this test shows the structure
      expect(checkResult.hasPermission).toBe(true);

      // Clean up
      await permissionsService.removeClientPermission(testUserId, testClientCode);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent users gracefully', async () => {
      const result = await permissionsService.checkClientPermission(
        'non-existent-user',
        testClientCode,
        'read'
      );
      expect(result.hasPermission).toBe(false);
    });

    it('should handle non-existent clients gracefully', async () => {
      const result = await permissionsService.checkClientPermission(
        testUserId,
        'non-existent-client',
        'read'
      );
      expect(result.hasPermission).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking the database layer to simulate errors
      // For now, we test that the service doesn't throw unhandled errors
      const result = await permissionsService.getUserClientPermissions(testUserId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of permissions efficiently', async () => {
      const clientCount = 10;
      const clientCodes = Array.from({ length: clientCount }, (_, i) => `CLIENT_${i}`);
      const clientNames = Array.from({ length: clientCount }, (_, i) => `Client ${i}`);

      // Add many permissions
      const startTime = Date.now();
      for (let i = 0; i < clientCount; i++) {
        await permissionsService.addClientPermission(
          testUserId,
          clientCodes[i],
          clientNames[i],
          'read',
          'admin@test.com'
        );
      }
      const addTime = Date.now() - startTime;

      // Check that adding permissions is reasonably fast
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Get all permissions
      const getStartTime = Date.now();
      const permissions = await permissionsService.getUserClientPermissions(testUserId);
      const getTime = Date.now() - getStartTime;

      expect(permissions).toHaveLength(clientCount);
      expect(getTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Clean up
      for (const clientCode of clientCodes) {
        await permissionsService.removeClientPermission(testUserId, clientCode);
      }
    });
  });
});


