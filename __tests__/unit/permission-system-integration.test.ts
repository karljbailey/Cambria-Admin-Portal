import { NextRequest } from 'next/server';
import { GET as getClients } from '../../app/api/clients/route';
import { GET as getFile } from '../../app/api/file/[id]/route';

// Mock all external dependencies
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
    }),
    drive: jest.fn().mockReturnValue({
      files: {
        get: jest.fn(),
        export: jest.fn()
      }
    })
  }
}));

describe('Permission System Integration Tests', () => {
  let mockUsersService: any;
  let mockIsFirebaseConfigured: any;
  let mockGoogleSheets: any;
  let mockGoogleDrive: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUsersService = require('@/lib/collections').usersService;
    mockIsFirebaseConfigured = require('@/lib/init').isFirebaseConfigured;
    mockGoogleSheets = require('googleapis').google.sheets();
    mockGoogleDrive = require('googleapis').google.drive();
  });

  describe('Client List Permission Filtering', () => {
    const mockClientsData = [
      ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
      ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20'],
      ['folder2', 'TEST', 'Test Client', 'Test Client Full', 'TRUE', '10', '15'],
      ['folder3', 'DEMO', 'Demo Client', 'Demo Client Full', 'TRUE', '12', '18'],
      ['folder4', 'PROD', 'Production Client', 'Production Client Full', 'TRUE', '8', '12']
    ];

    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockClientsData }
      });
    });

    describe('Admin User Access', () => {
      it('should return all clients for admin user', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'admin'
        });

        const request = new NextRequest('http://localhost:3000/api/clients?userId=admin-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(4);
        expect(data.clients.map((c: any) => c.clientCode)).toEqual(['CAM', 'TEST', 'DEMO', 'PROD']);
      });

      it('should return all clients for admin user regardless of clientPermissions', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'admin',
          clientPermissions: [
            { clientCode: 'CAM', permissionType: 'read' }
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/clients?userId=admin-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(4); // Should still get all clients
      });
    });

    describe('Regular User Access', () => {
      it('should filter clients based on user permissions', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: [
            { clientCode: 'CAM', permissionType: 'read' },
            { clientCode: 'TEST', permissionType: 'write' }
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(2);
        expect(data.clients.map((c: any) => c.clientCode)).toEqual(['CAM', 'TEST']);
      });

      it('should handle case-insensitive permission matching', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: [
            { clientCode: 'cam', permissionType: 'read' }, // lowercase
            { clientCode: 'Demo', permissionType: 'write' } // mixed case
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(2);
        expect(data.clients.map((c: any) => c.clientCode)).toEqual(['CAM', 'DEMO']);
      });

      it('should return empty array for user with no permissions', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: []
        });

        const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(0);
      });

      it('should return empty array for user with non-matching permissions', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: [
            { clientCode: 'NONEXISTENT', permissionType: 'read' }
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(0);
      });
    });

    describe('Error Handling', () => {
      it('should deny access when no user ID provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/clients');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      it('should deny access when user not found', async () => {
        mockUsersService.getById.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/clients?userId=nonexistent');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('User not found');
      });

      it('should deny access when Firebase not configured', async () => {
        mockIsFirebaseConfigured.mockReturnValue(false);

        const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      it('should deny access when permission check fails', async () => {
        mockUsersService.getById.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
        const response = await getClients(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Permission check failed');
      });
    });
  });

  describe('File Access Permission Control', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockGoogleDrive.files.get.mockResolvedValue({
        data: {
          name: 'test-file.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      mockGoogleDrive.files.export.mockResolvedValue({
        data: Buffer.from('test data')
      });
    });

    describe('Admin User File Access', () => {
      it('should allow admin to access any client file', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'admin'
        });

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=admin-123&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });

        expect(response.status).toBe(200);
      });

      it('should allow admin to access file for non-existent client', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'admin'
        });

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=admin-123&clientCode=NONEXISTENT');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });

        expect(response.status).toBe(200);
      });
    });

    describe('Regular User File Access', () => {
      it('should allow access when user has permission for the client', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: [
            { clientCode: 'CAM', permissionType: 'read' }
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });

        expect(response.status).toBe(200);
      });

      it('should deny access when user does not have permission for the client', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: [
            { clientCode: 'TEST', permissionType: 'read' }
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied. You do not have permission to access this client.');
      });

      it('should handle case-insensitive permission matching', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: [
            { clientCode: 'cam', permissionType: 'read' } // lowercase
          ]
        });

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM'); // uppercase
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });

        expect(response.status).toBe(200);
      });

      it('should deny access for user with no permissions', async () => {
        mockUsersService.getById.mockResolvedValue({
          id: 'user-123',
          email: 'user@test.com',
          role: 'basic',
          clientPermissions: []
        });

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied. You do not have permission to access this client.');
      });
    });

    describe('File Access Error Handling', () => {
      it('should require both userId and clientCode parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('User ID and client code are required');
      });

      it('should require both userId and clientCode parameters - missing userId', async () => {
        const request = new NextRequest('http://localhost:3000/api/file/file123?clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('User ID and client code are required');
      });

      it('should deny access when user not found', async () => {
        mockUsersService.getById.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=nonexistent&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied. You do not have permission to access this client.');
      });

      it('should deny access when Firebase not configured', async () => {
        mockIsFirebaseConfigured.mockReturnValue(false);

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied. You do not have permission to access this client.');
      });

      it('should deny access when permission check fails', async () => {
        mockUsersService.getById.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/file/file123?userId=user-123&clientCode=CAM');
        const response = await getFile(request, { params: Promise.resolve({ id: 'file123' }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied. You do not have permission to access this client.');
      });
    });
  });

  describe('Permission Logic Edge Cases', () => {
    it('should handle mixed permission types correctly', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20'],
            ['folder2', 'TEST', 'Test Client', 'Test Client Full', 'TRUE', '10', '15']
          ]
        }
      });

      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: [
          { clientCode: 'CAM', permissionType: 'read' },
          { clientCode: 'TEST', permissionType: 'write' },
          { clientCode: 'DEMO', permissionType: 'admin' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
      const response = await getClients(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clients).toHaveLength(2);
      expect(data.clients.map((c: any) => c.clientCode)).toEqual(['CAM', 'TEST']);
    });

    it('should handle duplicate permissions gracefully', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20']
          ]
        }
      });

      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: [
          { clientCode: 'CAM', permissionType: 'read' },
          { clientCode: 'CAM', permissionType: 'write' }, // duplicate
          { clientCode: 'cam', permissionType: 'admin' }  // duplicate with different case
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
      const response = await getClients(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clients).toHaveLength(1);
      expect(data.clients[0].clientCode).toBe('CAM');
    });

    it('should handle null/undefined clientPermissions gracefully', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockGoogleSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
            ['folder1', 'CAM', 'Cambria', 'Cambria Client', 'TRUE', '15', '20']
          ]
        }
      });

      mockUsersService.getById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'basic',
        clientPermissions: null
      });

      const request = new NextRequest('http://localhost:3000/api/clients?userId=user-123');
      const response = await getClients(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clients).toHaveLength(0);
    });
  });
});
