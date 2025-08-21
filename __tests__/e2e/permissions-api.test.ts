import { NextRequest, NextResponse } from 'next/server';
import { permissionsService } from '@/lib/collections';
import { isFirebaseConfigured } from '@/lib/init';

// Mock the Firebase initialization and services
jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn(),
  initializeApp: jest.fn()
}));

jest.mock('@/lib/collections', () => ({
  permissionsService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    getByUser: jest.fn(),
    getByType: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Import the route handlers
import { GET, POST, PUT, DELETE } from '@/app/api/permissions/list/route';

describe('Permissions API Fixed E2E Tests', () => {
  let mockPermissionsService: jest.Mocked<typeof permissionsService>;
  let mockIsFirebaseConfigured: jest.MockedFunction<typeof isFirebaseConfigured>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPermissionsService = permissionsService as jest.Mocked<typeof permissionsService>;
    mockIsFirebaseConfigured = isFirebaseConfigured as jest.MockedFunction<typeof isFirebaseConfigured>;
  });

  // Helper function to create a proper NextRequest
  const createRequest = (url: string, method: string = 'GET', body?: any): NextRequest => {
    const request = {
      url,
      method,
      json: jest.fn().mockResolvedValue(body),
      headers: new Map(),
      body: body ? JSON.stringify(body) : undefined
    } as any;
    
    return request;
  };

  describe('GET /api/permissions/list', () => {
    it('should fetch all permissions when Firebase is configured', async () => {
      const mockPermissions = [
        {
          id: '1',
          userId: 'user1',
          userName: 'John Admin',
          permissionType: 'admin' as const,
          resource: 'all',
          grantedBy: 'system',
          grantedAt: new Date('2024-01-01T00:00:00Z'),
          expiresAt: undefined,
          created_at: new Date('2024-01-01T00:00:00Z'),
          updated_at: new Date('2024-01-01T00:00:00Z')
        }
      ];

      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.getAll.mockResolvedValue(mockPermissions);

      const request = createRequest('http://localhost:3000/api/permissions/list');
      await GET(request);

      expect(mockPermissionsService.getAll).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: mockPermissions,
        count: 1
      });
    });

    it('should fetch permissions by user ID when Firebase is configured', async () => {
      const mockPermissions = [
        {
          id: '1',
          userId: 'user1',
          userName: 'John Admin',
          permissionType: 'admin' as const,
          resource: 'all',
          grantedBy: 'system',
          grantedAt: new Date('2024-01-01T00:00:00Z'),
          expiresAt: undefined,
          created_at: new Date('2024-01-01T00:00:00Z'),
          updated_at: new Date('2024-01-01T00:00:00Z')
        }
      ];

      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.getByUser.mockResolvedValue(mockPermissions);

      const request = createRequest('http://localhost:3000/api/permissions/list?userId=user1');
      await GET(request);

      expect(mockPermissionsService.getByUser).toHaveBeenCalledWith('user1');
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: mockPermissions,
        count: 1
      });
    });

    it('should use mock data when Firebase is not configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      const request = createRequest('http://localhost:3000/api/permissions/list');
      await GET(request);

      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            userId: 'user1',
            userName: 'John Admin',
            permissionType: 'admin'
          })
        ]),
        count: expect.any(Number)
      });
    });

    it('should handle Firebase errors gracefully and fall back to mock data', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.getAll.mockRejectedValue(new Error('Firebase connection failed'));

      const request = createRequest('http://localhost:3000/api/permissions/list');
      await GET(request);

      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            userId: 'user1',
            userName: 'John Admin',
            permissionType: 'admin'
          })
        ]),
        count: expect.any(Number)
      });
    });
  });

  describe('POST /api/permissions/list', () => {
    it('should create permission successfully when Firebase is configured', async () => {
      const permissionData = {
        userId: 'user4',
        userName: 'New User',
        permissionType: 'read' as const,
        resource: 'reports',
        grantedBy: 'user1'
      };

      const newPermission = {
        id: '4',
        ...permissionData,
        grantedAt: new Date(),
        expiresAt: undefined,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.add.mockResolvedValue(newPermission);

      const request = createRequest('http://localhost:3000/api/permissions/list', 'POST', permissionData);
      await POST(request);

      expect(mockPermissionsService.add).toHaveBeenCalledWith(permissionData);
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: newPermission,
        message: 'Permission created successfully'
      }, { status: 201 });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        userId: 'user4',
        // Missing userName and permissionType
      };

      const request = createRequest('http://localhost:3000/api/permissions/list', 'POST', invalidData);
      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing required fields: userId, userName, permissionType' },
        { status: 400 }
      );
    });

    it('should validate permission type', async () => {
      const invalidData = {
        userId: 'user4',
        userName: 'New User',
        permissionType: 'invalid' // Invalid permission type
      };

      const request = createRequest('http://localhost:3000/api/permissions/list', 'POST', invalidData);
      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid permission type. Must be admin, read, or write' },
        { status: 400 }
      );
    });
  });

  describe('PUT /api/permissions/list', () => {
    it('should update permission successfully when Firebase is configured', async () => {
      const updateData = {
        id: '1',
        permissionType: 'write' as const,
        resource: 'clients'
      };

      const existingPermission = {
        id: '1',
        userId: 'user1',
        userName: 'John Admin',
        permissionType: 'admin' as const,
        resource: 'all',
        grantedBy: 'system',
        grantedAt: new Date('2024-01-01T00:00:00Z'),
        expiresAt: undefined,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z')
      };

      const updatedPermission = {
        ...existingPermission,
        permissionType: 'write' as const,
        resource: 'clients',
        updated_at: new Date()
      };

      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.getById
        .mockResolvedValueOnce(existingPermission) // First call for existence check
        .mockResolvedValueOnce(updatedPermission); // Second call for updated permission
      mockPermissionsService.update.mockResolvedValue();

      const request = createRequest('http://localhost:3000/api/permissions/list', 'PUT', updateData);
      await PUT(request);

      expect(mockPermissionsService.getById).toHaveBeenCalledWith('1');
      expect(mockPermissionsService.update).toHaveBeenCalledWith('1', {
        permissionType: 'write',
        resource: 'clients'
      });
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: updatedPermission,
        message: 'Permission updated successfully'
      });
    });

    it('should validate required ID field', async () => {
      const invalidData = {
        permissionType: 'write' as const
        // Missing id
      };

      const request = createRequest('http://localhost:3000/api/permissions/list', 'PUT', invalidData);
      await PUT(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Permission ID is required' },
        { status: 400 }
      );
    });
  });

  describe('DELETE /api/permissions/list', () => {
    it('should delete permission successfully when Firebase is configured', async () => {
      const existingPermission = {
        id: '1',
        userId: 'user1',
        userName: 'John Admin',
        permissionType: 'admin' as const,
        resource: 'all',
        grantedBy: 'system',
        grantedAt: new Date('2024-01-01T00:00:00Z'),
        expiresAt: undefined,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z')
      };

      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.getById.mockResolvedValue(existingPermission);
      mockPermissionsService.delete.mockResolvedValue();

      const request = createRequest('http://localhost:3000/api/permissions/list?id=1');
      await DELETE(request);

      expect(mockPermissionsService.getById).toHaveBeenCalledWith('1');
      expect(mockPermissionsService.delete).toHaveBeenCalledWith('1');
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: existingPermission,
        message: 'Permission deleted successfully'
      });
    });

    it('should validate required ID parameter', async () => {
      const request = createRequest('http://localhost:3000/api/permissions/list');
      await DELETE(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Permission ID is required' },
        { status: 400 }
      );
    });
  });
});
