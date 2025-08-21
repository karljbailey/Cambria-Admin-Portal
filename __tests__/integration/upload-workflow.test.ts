import { NextRequest, NextResponse } from 'next/server';

// Mock all dependencies
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    drive: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      data,
      options
    }))
  }
}));

// Import the route handlers
import { POST as uploadPOST } from '@/app/api/upload/route';
import { GET as envCheckGET } from '@/app/api/upload/env-check/route';

describe('Upload Workflow Integration Tests', () => {
  let mockGoogleAuth: any;
  let mockDrive: any;
  let mockDriveFiles: any;
  let mockNextResponse: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked functions
    const { google } = require('googleapis');
    mockGoogleAuth = google.auth.GoogleAuth;
    mockDrive = google.drive;
    mockNextResponse = require('next/server').NextResponse;
    
    // Setup mock drive instance
    mockDriveFiles = {
      create: jest.fn()
    };
    
    mockDrive.mockReturnValue({
      files: mockDriveFiles
    });
    
    // Setup environment variables
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@service-account.com';
    process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\\n-----END PRIVATE KEY-----\\n';
    
    // Setup successful auth by default
    mockGoogleAuth.mockImplementation(() => ({}));
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
  });

  describe('Complete Upload Workflow', () => {
    it('should handle complete upload workflow from environment check to file upload', async () => {
      // Step 1: Check environment configuration
      const envCheckRequest = {} as any;
      const envCheckResponse = await envCheckGET(envCheckRequest);
      
      expect(envCheckResponse.data.configured).toBe(true);
      expect(envCheckResponse.data.details.hasServiceAccountEmail).toBe(true);
      expect(envCheckResponse.data.details.hasPrivateKey).toBe(true);

      // Step 2: Upload a file
      mockDriveFiles.create.mockResolvedValue({
        data: {
          id: 'file123',
          name: 'workflow-test.pdf'
        }
      });

      const mockFile = {
        name: 'workflow-test.pdf',
        type: 'application/pdf',
        size: 2048,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('test content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'workflow-folder-123');

      const uploadRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const uploadResponse = await uploadPOST(uploadRequest);

      expect(uploadResponse.data.success).toBe(true);
      expect(uploadResponse.data.fileId).toBe('file123');
      expect(uploadResponse.data.fileName).toBe('workflow-test.pdf');
      expect(uploadResponse.data.fileSize).toBe(2048);
      expect(uploadResponse.data.mimeType).toBe('application/pdf');
    });

    it('should handle workflow with missing environment variables', async () => {
      // Remove environment variables
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      delete process.env.GOOGLE_PRIVATE_KEY;

      // Step 1: Check environment configuration
      const envCheckRequest = {} as any;
      const envCheckResponse = await envCheckGET(envCheckRequest);
      
      expect(envCheckResponse.data.configured).toBe(false);
      expect(envCheckResponse.data.details.hasServiceAccountEmail).toBe(false);
      expect(envCheckResponse.data.details.hasPrivateKey).toBe(false);
      expect(envCheckResponse.data.recommendations.length).toBeGreaterThan(0);

      // Step 2: Attempt upload (should fail)
      const mockFile = {
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const uploadRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const uploadResponse = await uploadPOST(uploadRequest);

      expect(uploadResponse.data.error).toBe('Google Drive service not configured');
      expect(uploadResponse.options.status).toBe(503);
    });

    it('should handle workflow with different file types', async () => {
      const fileTypes = [
        { name: 'document.pdf', type: 'application/pdf', size: 1024 },
        { name: 'image.jpg', type: 'image/jpeg', size: 2048 },
        { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 3072 },
        { name: 'data.csv', type: 'text/csv', size: 512 },
        { name: 'unknown-file', type: '', size: 256 } // No MIME type
      ];

      for (const fileType of fileTypes) {
        mockDriveFiles.create.mockResolvedValue({
          data: { id: `file_${fileType.name}`, name: fileType.name }
        });

        const mockFile = {
          name: fileType.name,
          type: fileType.type,
          size: fileType.size,
          arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
        };

        const mockFormData = new Map();
        mockFormData.set('file', mockFile);
        mockFormData.set('folderId', 'folder123');

        const uploadRequest = {
          formData: jest.fn().mockResolvedValue(mockFormData)
        } as any;

        const uploadResponse = await uploadPOST(uploadRequest);

        expect(uploadResponse.data.success).toBe(true);
        expect(uploadResponse.data.fileName).toBe(fileType.name);
        expect(uploadResponse.data.fileSize).toBe(fileType.size);
        
        if (fileType.type) {
          expect(uploadResponse.data.mimeType).toBe(fileType.type);
        } else {
          expect(uploadResponse.data.mimeType).toBe('application/octet-stream');
        }
      }
    });

    it('should handle workflow with error recovery', async () => {
      // Step 1: First upload fails due to permission error
      const permissionError = {
        code: 403,
        message: 'Insufficient permissions'
      };
      mockDriveFiles.create.mockRejectedValueOnce(permissionError);

      const mockFile = {
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'restricted-folder');

      const uploadRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const failedResponse = await uploadPOST(uploadRequest);

      expect(failedResponse.data.error).toBe('Insufficient permissions to upload to this folder');
      expect(failedResponse.options.status).toBe(403);

      // Step 2: Second upload succeeds with different folder
      mockDriveFiles.create.mockResolvedValue({
        data: { id: 'file123', name: 'test.pdf' }
      });

      const newMockFormData = new Map();
      newMockFormData.set('file', mockFile);
      newMockFormData.set('folderId', 'accessible-folder');

      const newUploadRequest = {
        formData: jest.fn().mockResolvedValue(newMockFormData)
      } as any;

      const successResponse = await uploadPOST(newUploadRequest);

      expect(successResponse.data.success).toBe(true);
      expect(successResponse.data.fileId).toBe('file123');
    });
  });

  describe('Error Handling Workflow', () => {
    it('should provide helpful error messages throughout the workflow', async () => {
      const errorScenarios = [
        {
          setup: () => {
            delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
          },
          expectedError: 'Google Drive service not configured',
          expectedStatus: 503
        },
        {
          setup: () => {
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@service-account.com';
            process.env.GOOGLE_PRIVATE_KEY = 'test-private-key\\nwith\\nnewlines';
            mockDriveFiles.create.mockRejectedValue({
              code: 404,
              message: 'Folder not found'
            });
          },
          expectedError: 'Folder not found or does not exist',
          expectedStatus: 404
        },
        {
          setup: () => {
            mockDriveFiles.create.mockRejectedValue({
              code: 429,
              message: 'Rate limit exceeded'
            });
          },
          expectedError: 'Rate limit exceeded. Please try again later.',
          expectedStatus: 429
        }
      ];

      for (const scenario of errorScenarios) {
        scenario.setup();

        const mockFile = {
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
        };

        const mockFormData = new Map();
        mockFormData.set('file', mockFile);
        mockFormData.set('folderId', 'folder123');

        const uploadRequest = {
          formData: jest.fn().mockResolvedValue(mockFormData)
        } as any;

        const response = await uploadPOST(uploadRequest);

        expect(response.data.error).toBe(scenario.expectedError);
        expect(response.options.status).toBe(scenario.expectedStatus);
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent uploads', async () => {
      const uploadPromises = [];
      const fileCount = 5;

      for (let i = 0; i < fileCount; i++) {
        mockDriveFiles.create.mockResolvedValueOnce({
          data: { id: `file${i}`, name: `concurrent-file-${i}.pdf` }
        });

        const mockFile = {
          name: `concurrent-file-${i}.pdf`,
          type: 'application/pdf',
          size: 1024 + i * 100,
          arrayBuffer: jest.fn().mockResolvedValue(Buffer.from(`content-${i}`).buffer)
        };

        const mockFormData = new Map();
        mockFormData.set('file', mockFile);
        mockFormData.set('folderId', 'folder123');

        const uploadRequest = {
          formData: jest.fn().mockResolvedValue(mockFormData)
        } as any;

        uploadPromises.push(uploadPOST(uploadRequest));
      }

      const responses = await Promise.all(uploadPromises);

      expect(responses).toHaveLength(fileCount);
      
      for (let i = 0; i < fileCount; i++) {
        expect(responses[i].data.success).toBe(true);
        expect(responses[i].data.fileName).toBe(`concurrent-file-${i}.pdf`);
        expect(responses[i].data.fileId).toBe(`file${i}`);
      }

      expect(mockDriveFiles.create).toHaveBeenCalledTimes(fileCount);
    });

    it('should handle large files efficiently', async () => {
      const largeFileSize = 50 * 1024 * 1024; // 50MB
      
      mockDriveFiles.create.mockResolvedValue({
        data: { id: 'large-file-123', name: 'large-file.pdf' }
      });

      const mockFile = {
        name: 'large-file.pdf',
        type: 'application/pdf',
        size: largeFileSize,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.alloc(largeFileSize).buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const uploadRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(uploadRequest);

      expect(response.data.success).toBe(true);
      expect(response.data.fileSize).toBe(largeFileSize);
      expect(response.data.fileName).toBe('large-file.pdf');
    });
  });
});
