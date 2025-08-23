import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/auth';

// Mock all dependencies for controlled testing
jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn(),
  initializeApp: jest.fn()
}));

jest.mock('@/lib/collections', () => ({
  usersService: {
    getAll: jest.fn(),
    add: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getByEmail: jest.fn()
  }
}));

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  createSessionToken: jest.fn(),
  validateSessionToken: jest.fn()
}));

jest.mock('@/lib/audit', () => ({
  auditHelpers: {
    userCreated: jest.fn(),
    userLoggedIn: jest.fn(),
    userDeleted: jest.fn(),
    permissionsUpdated: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      data,
      options,
      cookies: {
        set: jest.fn()
      }
    }))
  }
}));

// Import the route handlers
import { POST as createUserPOST, GET as getUsersGET } from '@/app/api/users/route';

describe('Users API E2E Tests', () => {
  let mockUsersService: any;
  let mockHashPassword: any;
  let mockAuditHelpers: any;
  let mockNextResponse: any;
  let mockIsFirebaseConfigured: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked functions
    mockUsersService = require('@/lib/collections').usersService;
    mockHashPassword = require('@/lib/auth').hashPassword;
    mockAuditHelpers = require('@/lib/audit').auditHelpers;
    mockNextResponse = require('next/server').NextResponse;
    mockIsFirebaseConfigured = require('@/lib/init').isFirebaseConfigured;

    // Setup default mock implementations
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockNextResponse.json.mockImplementation((data, options) => ({
      data,
      options
    }));
    mockHashPassword.mockResolvedValue({ 
      hash: 'hashed_password_with_pepper', 
      salt: 'random_salt_123' 
    });
    mockAuditHelpers.userCreated.mockResolvedValue(undefined);
  });

  describe('User Creation Tests', () => {
    it('should create user with proper password hashing and audit logging', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      const createdUser = {
        id: 'user123',
        email: userData.email,
        name: userData.name,
        role: userData.role,
        passwordHash: 'hashed_password_with_pepper',
        passwordSalt: 'random_salt_123',
        status: 'active',
        lastLogin: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsersService.getByEmail.mockResolvedValue(null); // User doesn't exist
      mockUsersService.add.mockResolvedValue(createdUser);

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      // Verify successful creation
      expect(response.data.success).toBe(true);
      expect(response.data.user.email).toBe(userData.email);
      expect(response.data.user.name).toBe(userData.name);
      expect(response.data.user.role).toBe(userData.role);
      expect(response.data.user.status).toBe('active');
      expect(response.options.status).toBe(201);

      // Verify password was hashed with pepper
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password);

      // Verify user was created in database
      expect(mockUsersService.add).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        passwordHash: 'hashed_password_with_pepper',
        passwordSalt: 'random_salt_123',
        status: 'active',
        lastLogin: null
      });

      // Verify audit log was created
      expect(mockAuditHelpers.userCreated).toHaveBeenCalledWith(
        userData.name,
        userData.email
      );

      // Verify sensitive data is not returned
      expect(response.data.user.passwordHash).toBeUndefined();
      expect(response.data.user.passwordSalt).toBeUndefined();
    });

    it('should create admin user successfully', async () => {
      const adminData = {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        password: 'AdminPassword123!'
      };

      const createdAdmin = {
        id: 'admin123',
        ...adminData,
        passwordHash: 'hashed_admin_password',
        passwordSalt: 'admin_salt_456',
        status: 'active',
        lastLogin: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.add.mockResolvedValue(createdAdmin);

      const request = {
        json: jest.fn().mockResolvedValue(adminData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(true);
      expect(response.data.user.role).toBe('admin');
      expect(mockUsersService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin'
        })
      );
    });

    it('should handle password hashing failures gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      mockUsersService.getByEmail.mockResolvedValue(null);
      mockHashPassword.mockRejectedValue(new Error('Hashing failed'));

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Failed to process password');
      expect(response.options.status).toBe(500);
    });
  });

  describe('Input Validation Tests', () => {
    it('should reject user creation with missing email', async () => {
      const userData = {
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
        // Missing email
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Missing required fields: email, name, role, password');
      expect(response.options.status).toBe(400);
    });

    it('should reject user creation with missing name', async () => {
      const userData = {
        email: 'test@example.com',
        role: 'basic',
        password: 'SecurePassword123!'
        // Missing name
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Missing required fields: email, name, role, password');
    });

    it('should reject user creation with missing role', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePassword123!'
        // Missing role
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Missing required fields: email, name, role, password');
    });

    it('should reject user creation with missing password', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic'
        // Missing password
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Missing required fields: email, name, role, password');
    });

    it('should reject user creation with invalid email format', async () => {
      const userData = {
        email: 'invalid-email-format',
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Invalid email format');
      expect(response.options.status).toBe(400);
    });

    it('should reject user creation with invalid role', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'superuser', // Invalid role
        password: 'SecurePassword123!'
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Invalid role. Must be "admin" or "basic"');
      expect(response.options.status).toBe(400);
    });

    it('should reject user creation with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: '123' // Too short
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Password must be at least 8 characters long');
      expect(response.options.status).toBe(400);
    });
  });

  describe('Duplicate User Handling', () => {
    it('should reject user creation with existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'New User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      const existingUser = {
        id: 'existing123',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'basic',
        status: 'active'
      };

      mockUsersService.getByEmail.mockResolvedValue(existingUser);

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('User with this email already exists');
      expect(response.options.status).toBe(409);
      expect(mockUsersService.add).not.toHaveBeenCalled();
    });
  });

  describe('Firebase Configuration Tests', () => {
    it('should handle Firebase not configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Firebase is not configured. Please configure Firebase to create users.');
      expect(response.options.status).toBe(503);
    });
  });

  describe('Audit Logging Tests', () => {
    it('should continue user creation even if audit logging fails', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      const createdUser = {
        id: 'user123',
        ...userData,
        passwordHash: 'hashed_password',
        passwordSalt: 'salt_123',
        status: 'active',
        lastLogin: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.add.mockResolvedValue(createdUser);
      mockAuditHelpers.userCreated.mockRejectedValue(new Error('Audit service unavailable'));

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      // User creation should still succeed
      expect(response.data.success).toBe(true);
      expect(response.data.user.email).toBe(userData.email);
      expect(mockAuditHelpers.userCreated).toHaveBeenCalled();
    });
  });

  describe('Get Users Tests', () => {
    it('should retrieve all users without sensitive data', async () => {
      const users = [
        {
          id: 'user1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'basic',
          status: 'active',
          passwordHash: 'sensitive_hash_1',
          passwordSalt: 'sensitive_salt_1',
          lastLogin: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'user2',
          email: 'user2@example.com',
          name: 'User Two',
          role: 'admin',
          status: 'active',
          passwordHash: 'sensitive_hash_2',
          passwordSalt: 'sensitive_salt_2',
          lastLogin: '2024-01-15T10:30:00Z',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockUsersService.getAll.mockResolvedValue(users);

      const response = await getUsersGET();

      expect(response.data.success).toBe(true);
      expect(response.data.users).toHaveLength(2);
      
      // Verify sensitive data is not returned
      response.data.users.forEach((user: any) => {
        expect(user.passwordHash).toBeUndefined();
        expect(user.passwordSalt).toBeUndefined();
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.role).toBeDefined();
        expect(user.status).toBeDefined();
      });
    });

    it('should handle Firebase not configured for GET', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      const response = await getUsersGET();

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Firebase is not configured. Please configure Firebase to retrieve users.');
      expect(response.options.status).toBe(503);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Failed to create user');
      expect(response.options.status).toBe(500);
    });

    it('should handle database errors gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: 'SecurePassword123!'
      };

      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.add.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Failed to create user');
      expect(response.options.status).toBe(500);
    });
  });

  describe('Security Tests', () => {
    it('should handle special characters in passwords', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: 'P@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?'
      };

      const createdUser = {
        id: 'user123',
        ...userData,
        passwordHash: 'hashed_special_password',
        passwordSalt: 'special_salt',
        status: 'active',
        lastLogin: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.add.mockResolvedValue(createdUser);

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(true);
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(100); // 100 character password
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'basic',
        password: longPassword
      };

      const createdUser = {
        id: 'user123',
        ...userData,
        passwordHash: 'hashed_long_password',
        passwordSalt: 'long_salt',
        status: 'active',
        lastLogin: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.add.mockResolvedValue(createdUser);

      const request = {
        json: jest.fn().mockResolvedValue(userData)
      } as any;

      const response = await createUserPOST(request);

      expect(response.data.success).toBe(true);
      expect(mockHashPassword).toHaveBeenCalledWith(longPassword);
    });
  });
});


