import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../app/api/permissions/client/route';

// Mock the permissions service
jest.mock('../../lib/permissions', () => ({
  permissionsService: {
    checkClientPermission: jest.fn(),
    getUserClientPermissions: jest.fn(),
    addClientPermission: jest.fn(),
    updateClientPermission: jest.fn(),
    removeClientPermission: jest.fn()
  }
}));

// Mock the collections module
jest.mock('../../lib/collections', () => ({
  usersService: {
    getById: jest.fn()
  }
}));

// Mock the init module
jest.mock('../../lib/init', () => ({
  isFirebaseConfigured: jest.fn(() => true)
}));

import { permissionsService } from '../../lib/permissions';
import { usersService } from '../../lib/collections';

const mockPermissionsService = permissionsService as jest.Mocked<typeof permissionsService>;
const mockUsersService = usersService as jest.Mocked<typeof usersService>;

describe('Client Permissions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/permissions/client', () => {
    it('should return specific client permission when userId and clientCode provided', async () => {
      const mockPermission = {
        hasPermission: true,
        permissionType: 'write' as const,
        clientName: 'Test Client'
      };

      mockPermissionsService.checkClientPermission.mockResolvedValue(mockPermission);

      const request = new NextRequest('http://localhost:3000/api/permissions/client?userId=user1&clientCode=CLIENT001');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.permission).toEqual(mockPermission);
      expect(mockPermissionsService.checkClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001', 'read');
    });

    it('should return all client permissions when only userId provided', async () => {
      const mockPermissions = [
        {
          clientCode: 'CLIENT001',
          clientName: 'Test Client 1',
          permissionType: 'read' as const,
          grantedBy: 'admin@test.com',
          grantedAt: new Date(),
          expiresAt: undefined
        },
        {
          clientCode: 'CLIENT002',
          clientName: 'Test Client 2',
          permissionType: 'write' as const,
          grantedBy: 'admin@test.com',
          grantedAt: new Date(),
          expiresAt: undefined
        }
      ];

      mockPermissionsService.getUserClientPermissions.mockResolvedValue(mockPermissions);

      const request = new NextRequest('http://localhost:3000/api/permissions/client?userId=user1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.permissions).toEqual(mockPermissions);
      expect(mockPermissionsService.getUserClientPermissions).toHaveBeenCalledWith('user1');
    });

    it('should return error when userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/permissions/client');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID is required');
    });

    it('should handle errors gracefully', async () => {
      mockPermissionsService.checkClientPermission.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/permissions/client?userId=user1&clientCode=CLIENT001');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/permissions/client', () => {
    it('should add client permission successfully', async () => {
      const mockUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'basic' as const,
        status: 'active' as const
      };

      mockUsersService.getById.mockResolvedValue(mockUser);
      mockPermissionsService.addClientPermission.mockResolvedValue(true);

      const requestBody = {
        userId: 'user1',
        clientCode: 'CLIENT001',
        clientName: 'Test Client',
        permissionType: 'write',
        grantedBy: 'admin@test.com'
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Client permission added successfully');
      expect(mockPermissionsService.addClientPermission).toHaveBeenCalledWith(
        'user1',
        'CLIENT001',
        'Test Client',
        'write',
        'admin@test.com'
      );
    });

    it('should return error when required fields are missing', async () => {
      const requestBody = {
        userId: 'user1',
        clientCode: 'CLIENT001'
        // Missing other required fields
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error for invalid permission type', async () => {
      const requestBody = {
        userId: 'user1',
        clientCode: 'CLIENT001',
        clientName: 'Test Client',
        permissionType: 'invalid',
        grantedBy: 'admin@test.com'
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid permission type');
    });

    it('should return error when user not found', async () => {
      mockUsersService.getById.mockResolvedValue(null);

      const requestBody = {
        userId: 'nonexistent',
        clientCode: 'CLIENT001',
        clientName: 'Test Client',
        permissionType: 'write',
        grantedBy: 'admin@test.com'
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should handle errors gracefully', async () => {
      mockUsersService.getById.mockRejectedValue(new Error('Database error'));

      const requestBody = {
        userId: 'user1',
        clientCode: 'CLIENT001',
        clientName: 'Test Client',
        permissionType: 'write',
        grantedBy: 'admin@test.com'
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/permissions/client', () => {
    it('should update client permission successfully', async () => {
      mockPermissionsService.updateClientPermission.mockResolvedValue(true);

      const requestBody = {
        userId: 'user1',
        clientCode: 'CLIENT001',
        permissionType: 'admin'
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Client permission updated successfully');
      expect(mockPermissionsService.updateClientPermission).toHaveBeenCalledWith(
        'user1',
        'CLIENT001',
        'admin'
      );
    });

    it('should return error when required fields are missing', async () => {
      const requestBody = {
        userId: 'user1'
        // Missing clientCode and permissionType
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error for invalid permission type', async () => {
      const requestBody = {
        userId: 'user1',
        clientCode: 'CLIENT001',
        permissionType: 'invalid'
      };

      const request = new NextRequest('http://localhost:3000/api/permissions/client', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid permission type');
    });
  });

  describe('DELETE /api/permissions/client', () => {
    it('should remove client permission successfully', async () => {
      mockPermissionsService.removeClientPermission.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/permissions/client?userId=user1&clientCode=CLIENT001');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Client permission removed successfully');
      expect(mockPermissionsService.removeClientPermission).toHaveBeenCalledWith('user1', 'CLIENT001');
    });

    it('should return error when userId or clientCode is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/permissions/client?userId=user1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID and client code are required');
    });

    it('should handle errors gracefully', async () => {
      mockPermissionsService.removeClientPermission.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/permissions/client?userId=user1&clientCode=CLIENT001');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});

