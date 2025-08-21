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

// Import the route handler
import { POST as uploadPOST } from '@/app/api/upload/route';

describe('Fixed Upload API E2E Tests', () => {
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
    process.env.GOOGLE_PRIVATE_KEY = 'test-private-key\\nwith\\nnewlines';
    
    // Setup successful auth by default
    mockGoogleAuth.mockImplementation(() => ({}));
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
  });

  describe('Successful Upload Tests', () => {
    it('should upload file successfully with valid file and folder ID', async () => {
      // Mock successful Google Drive response
      mockDriveFiles.create.mockResolvedValue({
        data: {
          id: 'file123',
          name: 'test-file.pdf'
        }
      });

      // Create mock file with proper arrayBuffer method
      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('test content').buffer)
      };

      // Create mock FormData
      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.success).toBe(true);
      expect(response.data.fileId).toBe('file123');
      expect(response.data.fileName).toBe('test-file.pdf');
      expect(response.data.message).toBe('File uploaded successfully');
      expect(mockDriveFiles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            name: 'test-file.pdf',
            parents: ['folder123'],
            supportsAllDrives: true,
            supportsTeamDrives: true
          }),
          media: expect.objectContaining({
            mimeType: 'application/pdf'
          }),
          supportsAllDrives: true,
          supportsTeamDrives: true
        })
      );
    });

    it('should handle file with no MIME type', async () => {
      mockDriveFiles.create.mockResolvedValue({
        data: { id: 'file123', name: 'unknown-file' }
      });

      const mockFile = {
        name: 'unknown-file',
        type: '', // No MIME type
        size: 512,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.success).toBe(true);
      expect(mockDriveFiles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          media: expect.objectContaining({
            mimeType: 'application/octet-stream' // Default MIME type
          })
        })
      );
    });
  });

  describe('Input Validation Tests', () => {
    it('should return 400 error when no file is provided', async () => {
      const mockFormData = new Map();
      mockFormData.set('folderId', 'folder123');
      // No file set

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('No file provided');
      expect(response.options.status).toBe(400);
      expect(mockDriveFiles.create).not.toHaveBeenCalled();
    });

    it('should return 400 error when folder ID is empty string', async () => {
      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn()
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', '   '); // Empty/whitespace folder ID

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('No folder ID provided');
      expect(response.options.status).toBe(400);
    });

    it('should return 413 error for files that are too large', async () => {
      const mockFile = {
        name: 'huge-file.zip',
        type: 'application/zip',
        size: 200 * 1024 * 1024, // 200MB (exceeds 100MB limit)
        arrayBuffer: jest.fn()
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('File too large. Maximum size is 100MB.');
      expect(response.options.status).toBe(413);
      expect(mockDriveFiles.create).not.toHaveBeenCalled();
    });
  });

  describe('Environment Variable Validation Tests', () => {
    it('should return 503 error when Google service account email is missing', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn()
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Google Drive service not configured');
      expect(response.options.status).toBe(503);
      expect(mockGoogleAuth).not.toHaveBeenCalled();
    });

    it('should return 503 error when Google private key is missing', async () => {
      delete process.env.GOOGLE_PRIVATE_KEY;

      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn()
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Google Drive service not configured');
      expect(response.options.status).toBe(503);
    });
  });

  describe('Google API Error Handling Tests', () => {
    it('should handle Google Auth initialization errors', async () => {
      mockGoogleAuth.mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Authentication service initialization failed');
      expect(response.options.status).toBe(500);
    });

    it('should handle specific Google Drive API errors', async () => {
      const testCases = [
        {
          driveError: { code: 403, message: 'Insufficient permissions' },
          expectedError: 'Insufficient permissions to upload to this folder',
          expectedStatus: 403
        },
        {
          driveError: { code: 404, message: 'Folder not found' },
          expectedError: 'Folder not found or does not exist',
          expectedStatus: 404
        },
        {
          driveError: { code: 401, message: 'Invalid authentication' },
          expectedError: 'Authentication failed with Google Drive',
          expectedStatus: 401
        },
        {
          driveError: { code: 429, message: 'Rate limit exceeded' },
          expectedError: 'Rate limit exceeded. Please try again later.',
          expectedStatus: 429
        },
        {
          driveError: { code: 500, message: 'Internal server error' },
          expectedError: 'Google Drive service temporarily unavailable',
          expectedStatus: 503
        }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockDriveFiles.create.mockRejectedValue(testCase.driveError);

        const mockFile = {
          name: 'test-file.pdf',
          type: 'application/pdf',
          size: 1024,
          arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
        };

        const mockFormData = new Map();
        mockFormData.set('file', mockFile);
        mockFormData.set('folderId', 'folder123');

        const mockRequest = {
          formData: jest.fn().mockResolvedValue(mockFormData)
        } as any;

        const response = await uploadPOST(mockRequest);

        expect(response.data.error).toBe(testCase.expectedError);
        expect(response.options.status).toBe(testCase.expectedStatus);
      }
    });

    it('should handle storage quota exceeded error specifically', async () => {
      const quotaError = {
        code: 403,
        message: 'Service Accounts do not have storage quota'
      };
      mockDriveFiles.create.mockRejectedValue(quotaError);

      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Service Account storage quota exceeded. Please use a shared drive or contact administrator.');
      expect(response.data.details).toBe('Service accounts have limited storage. Consider using a shared drive or OAuth delegation.');
      expect(response.options.status).toBe(403);
    });
  });

  describe('File Processing Error Tests', () => {
    it('should handle file.arrayBuffer() throwing error', async () => {
      const mockFile = {
        name: 'corrupted-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockRejectedValue(new Error('Failed to read file'))
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Failed to process file data');
      expect(response.options.status).toBe(400);
      expect(mockDriveFiles.create).not.toHaveBeenCalled();
    });

    it('should handle FormData parsing errors', async () => {
      const mockRequest = {
        formData: jest.fn().mockRejectedValue(new Error('Failed to parse form data'))
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Failed to upload file');
      expect(response.data.details).toBe('Failed to parse form data');
      expect(response.options.status).toBe(500);
    });
  });

  describe('Response Validation Tests', () => {
    it('should handle successful upload but missing file ID', async () => {
      mockDriveFiles.create.mockResolvedValue({
        data: {
          // Missing id property
          name: 'test-file.pdf'
        }
      });

      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      const response = await uploadPOST(mockRequest);

      expect(response.data.error).toBe('Upload completed but file ID not received');
      expect(response.options.status).toBe(500);
    });
  });

  describe('Logging Tests', () => {
    it('should log successful uploads', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockDriveFiles.create.mockResolvedValue({
        data: { id: 'file123', name: 'test-file.pdf' }
      });

      const mockFile = {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content').buffer)
      };

      const mockFormData = new Map();
      mockFormData.set('file', mockFile);
      mockFormData.set('folderId', 'folder123');

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as any;

      await uploadPOST(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith('✅ File uploaded successfully: test-file.pdf (file123)');
      
      consoleSpy.mockRestore();
    });
  });
});
