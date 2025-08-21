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

describe('Permissions Simple Integration Tests', () => {
  let mockPermissionsService: jest.Mocked<typeof permissionsService>;
  let mockIsFirebaseConfigured: jest.MockedFunction<typeof isFirebaseConfigured>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPermissionsService = permissionsService as jest.Mocked<typeof permissionsService>;
    mockIsFirebaseConfigured = isFirebaseConfigured as jest.MockedFunction<typeof isFirebaseConfigured>;
  });

  afterEach(() => {
    // Reset mock data state between tests
    jest.clearAllMocks();
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

  describe('Core Functionality', () => {
    it('should handle complete CRUD workflow with Firebase', async () => {
      // Setup Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);

      // Mock data for the workflow
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

      const newPermission = {
        id: '2',
        userId: 'user2',
        userName: 'New User',
        permissionType: 'read' as const,
        resource: 'reports',
        grantedBy: 'user1',
        grantedAt: new Date(),
        expiresAt: undefined,
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedPermission = {
        ...newPermission,
        permissionType: 'write' as const,
        resource: 'clients',
        updated_at: new Date()
      };

      // Mock service responses - reset mocks for each operation
      mockPermissionsService.getAll.mockResolvedValue(mockPermissions);
      mockPermissionsService.add.mockResolvedValue(newPermission);
      mockPermissionsService.getById
        .mockResolvedValueOnce(newPermission) // For update existence check
        .mockResolvedValueOnce(updatedPermission) // For update result
        .mockResolvedValueOnce(updatedPermission); // For delete existence check
      mockPermissionsService.update.mockResolvedValue();
      mockPermissionsService.delete.mockResolvedValue();

      // Test 1: GET all permissions
      const getRequest = createRequest('http://localhost:3000/api/permissions/list');
      await GET(getRequest);

      expect(mockPermissionsService.getAll).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: mockPermissions,
        count: 1
      });

      // Test 2: POST new permission
      const postData = {
        userId: 'user2',
        userName: 'New User',
        permissionType: 'read' as const,
        resource: 'reports',
        grantedBy: 'user1'
      };

      const postRequest = createRequest('http://localhost:3000/api/permissions/list', 'POST', postData);
      await POST(postRequest);

      expect(mockPermissionsService.add).toHaveBeenCalledWith(postData);
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: newPermission,
        message: 'Permission created successfully'
      }, { status: 201 });

      // Test 3: PUT update permission
      const putData = {
        id: '2',
        permissionType: 'write' as const,
        resource: 'clients'
      };

      const putRequest = createRequest('http://localhost:3000/api/permissions/list', 'PUT', putData);
      await PUT(putRequest);

      expect(mockPermissionsService.getById).toHaveBeenCalledWith('2');
      expect(mockPermissionsService.update).toHaveBeenCalledWith('2', {
        permissionType: 'write',
        resource: 'clients'
      });
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: updatedPermission,
        message: 'Permission updated successfully'
      });

      // Test 4: DELETE permission
      const deleteRequest = createRequest('http://localhost:3000/api/permissions/list?id=2');
      await DELETE(deleteRequest);

      expect(mockPermissionsService.getById).toHaveBeenCalledWith('2');
      expect(mockPermissionsService.delete).toHaveBeenCalledWith('2');
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: updatedPermission,
        message: 'Permission deleted successfully'
      });
    });

    it('should handle complete CRUD workflow with mock data', async () => {
      // Setup Firebase as not configured
      mockIsFirebaseConfigured.mockReturnValue(false);

      // Test 1: GET all permissions (should use mock data)
      const getRequest = createRequest('http://localhost:3000/api/permissions/list');
      await GET(getRequest);

      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            userId: expect.any(String),
            userName: expect.any(String),
            permissionType: expect.any(String)
          })
        ]),
        count: expect.any(Number)
      });

      // Test 2: POST new permission (should create in mock data)
      const postData = {
        userId: 'user4',
        userName: 'New User',
        permissionType: 'read' as const,
        resource: 'reports',
        grantedBy: 'user1'
      };

      const postRequest = createRequest('http://localhost:3000/api/permissions/list', 'POST', postData);
      await POST(postRequest);

      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: expect.objectContaining({
          id: expect.any(String),
          ...postData,
          grantedAt: expect.any(Date),
          expiresAt: undefined,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        }),
        message: 'Permission created successfully'
      }, { status: 201 });

      // Test 3: PUT update permission (should update mock data)
      const putData = {
        id: '1',
        permissionType: 'write' as const,
        resource: 'clients'
      };

      const putRequest = createRequest('http://localhost:3000/api/permissions/list', 'PUT', putData);
      await PUT(putRequest);

      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: expect.objectContaining({
          id: '1',
          permissionType: 'write',
          resource: 'clients',
          updated_at: expect.any(Date)
        }),
        message: 'Permission updated successfully'
      });

      // Test 4: DELETE permission (should delete from mock data)
      const deleteRequest = createRequest('http://localhost:3000/api/permissions/list?id=1');
      await DELETE(deleteRequest);

      // Check that we got a successful response with a permission object
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permission: expect.objectContaining({
          id: expect.any(String),
          userId: expect.any(String),
          userName: expect.any(String),
          permissionType: expect.any(String)
        }),
        message: 'Permission deleted successfully'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase errors gracefully', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockPermissionsService.getAll.mockRejectedValue(new Error('Firebase connection failed'));

      const request = createRequest('http://localhost:3000/api/permissions/list');
      await GET(request);

      // Should fall back to mock data
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        permissions: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            userId: expect.any(String),
            userName: expect.any(String),
            permissionType: expect.any(String)
          })
        ]),
        count: expect.any(Number)
      });
    });

    it('should handle validation errors properly', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);

      // Test missing required fields
      const invalidPostData = {
        userId: 'user4'
        // Missing userName and permissionType
      };

      const postRequest = createRequest('http://localhost:3000/api/permissions/list', 'POST', invalidPostData);
      await POST(postRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing required fields: userId, userName, permissionType' },
        { status: 400 }
      );

      // Test invalid permission type
      const invalidTypeData = {
        userId: 'user4',
        userName: 'New User',
        permissionType: 'invalid'
      };

      const invalidTypeRequest = createRequest('http://localhost:3000/api/permissions/list', 'POST', invalidTypeData);
      await POST(invalidTypeRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid permission type. Must be admin, read, or write' },
        { status: 400 }
      );

      // Test missing ID for PUT
      const invalidPutData = {
        permissionType: 'write' as const
        // Missing id
      };

      const putRequest = createRequest('http://localhost:3000/api/permissions/list', 'PUT', invalidPutData);
      await PUT(putRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Permission ID is required' },
        { status: 400 }
      );

      // Test missing ID for DELETE
      const deleteRequest = createRequest('http://localhost:3000/api/permissions/list');
      await DELETE(deleteRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Permission ID is required' },
        { status: 400 }
      );
    });
  });
});
