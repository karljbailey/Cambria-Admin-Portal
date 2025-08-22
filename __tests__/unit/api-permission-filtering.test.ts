import { NextRequest } from 'next/server';
import { GET } from '../../app/api/clients/route';

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
    sheets: jest.fn().mockReturnValue({
      spreadsheets: {
        values: {
          get: jest.fn()
        }
      }
    })
  }
}));

describe('API Permission Filtering Tests', () => {
  let mockUsersService: any;
  let mockIsFirebaseConfigured: any;
  let mockGoogleSheets: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUsersService = require('@/lib/collections').usersService;
    mockIsFirebaseConfigured = require('@/lib/init').isFirebaseConfigured;
    mockGoogleSheets = require('googleapis').google.sheets();
  });

  describe('GET /api/clients with user permissions', () => {
    it('should return all clients for admin user', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock admin user
      mockUsersService.getById.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'admin'
      });

      // Mock Google Sheets response
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20'],
            ['folder2', 'TEST', 'Test Client', 'Test Client Full', 'TRUE', '10', '15']
          ]
        }
      });

      // Create request with user ID
      const request = new NextRequest('http://localhost:3000/api/clients?userId=admin-123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clients).toHaveLength(2);
      expect(data.clients[0].clientCode).toBe('CAM');
      expect(data.clients[1].clientCode).toBe('TEST');
    });

    it('should filter clients for regular user based on permissions', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock regular user with specific permissions
      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: [
          { clientCode: 'CAM', permissionType: 'read' }
        ]
      });

      // Mock Google Sheets response
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20'],
            ['folder2', 'TEST', 'Test Client', 'Test Client Full', 'TRUE', '10', '15']
          ]
        }
      });

      // Create request with user ID
      const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clients).toHaveLength(1);
      expect(data.clients[0].clientCode).toBe('CAM');
    });

    it('should deny access when no user ID provided', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);

      // Mock Google Sheets response
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20'],
            ['folder2', 'TEST', 'Test Client', 'Test Client Full', 'TRUE', '10', '15']
          ]
        }
      });

      // Create request without user ID
      const request = new NextRequest('http://localhost:3000/api/clients');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should deny access when Firebase not configured', async () => {
      // Mock Firebase as not configured
      mockIsFirebaseConfigured.mockReturnValue(false);

      // Mock Google Sheets response
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20'],
            ['folder2', 'TEST', 'Test Client', 'Test Client Full', 'TRUE', '10', '15']
          ]
        }
      });

      // Create request with user ID
      const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
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

      // Mock Google Sheets response with uppercase client code
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20']
          ]
        }
      });

      // Create request with user ID
      const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clients).toHaveLength(1);
      expect(data.clients[0].clientCode).toBe('CAM');
    });

    it('should deny access when user not found', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock user not found
      mockUsersService.getById.mockResolvedValue(null);

      // Mock Google Sheets response
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20']
          ]
        }
      });

      // Create request with user ID
      const request = new NextRequest('http://localhost:3000/api/clients?userId=nonexistent');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User not found');
    });
  });
});
