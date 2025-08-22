import { NextRequest } from 'next/server';
import { GET } from '../../app/api/file/[id]/route';

// Mock the dependencies
jest.mock('@/lib/collections', () => ({
  usersService: {
    getById: jest.fn()
  }
}));

jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn()
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn()
      }))
    },
    drive: jest.fn().mockReturnValue({
      files: {
        get: jest.fn(),
        export: jest.fn()
      }
    })
  }
}));

describe('File API Protection Tests', () => {
  let mockUsersService: any;
  let mockIsFirebaseConfigured: any;
  let mockGoogleDrive: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUsersService = require('@/lib/collections').usersService;
    mockIsFirebaseConfigured = require('@/lib/init').isFirebaseConfigured;
    mockGoogleDrive = require('googleapis').google.drive();
  });

  describe('GET /api/file/[id] with user permissions', () => {
    it('should allow access for admin user', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock admin user
      mockUsersService.getById.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'admin'
      });

      // Mock Google Drive response
      mockGoogleDrive.files.get.mockResolvedValue({
        data: {
          name: 'test-file.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      mockGoogleDrive.files.export.mockResolvedValue({
        data: Buffer.from('test data')
      });

      // Create request with user ID and client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=admin-123&clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });

      expect(response.status).toBe(200);
    });

    it('should allow access for user with client permission', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock regular user with CAM permission
      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: [
          { clientCode: 'CAM', permissionType: 'read' }
        ]
      });

      // Mock Google Drive response
      mockGoogleDrive.files.get.mockResolvedValue({
        data: {
          name: 'test-file.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      mockGoogleDrive.files.export.mockResolvedValue({
        data: Buffer.from('test data')
      });

      // Create request with user ID and client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });

      expect(response.status).toBe(200);
    });

    it('should deny access for user without client permission', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock regular user without CAM permission
      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: [
          { clientCode: 'TEST', permissionType: 'read' }
        ]
      });

      // Create request with user ID and client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied. You do not have permission to access this client.');
    });

    it('should deny access when no user ID provided', async () => {
      // Create request without user ID
      const request = new NextRequest('http://localhost:3000/api/file/file123?clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID and client code are required');
    });

    it('should deny access when no client code provided', async () => {
      // Create request without client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID and client code are required');
    });

    it('should handle case-insensitive client code matching', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock regular user with lowercase permission
      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: [
          { clientCode: 'cam', permissionType: 'read' }
        ]
      });

      // Mock Google Drive response
      mockGoogleDrive.files.get.mockResolvedValue({
        data: {
          name: 'test-file.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      mockGoogleDrive.files.export.mockResolvedValue({
        data: Buffer.from('test data')
      });

      // Create request with uppercase client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });

      expect(response.status).toBe(200);
    });

    it('should deny access when user not found', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock user not found
      mockUsersService.getById.mockResolvedValue(null);

      // Create request with user ID and client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=nonexistent&clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied. You do not have permission to access this client.');
    });

    it('should deny access when Firebase not configured', async () => {
      // Mock Firebase as not configured
      mockIsFirebaseConfigured.mockReturnValue(false);

      // Create request with user ID and client code
      const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
      
      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied. You do not have permission to access this client.');
    });
  });
});
