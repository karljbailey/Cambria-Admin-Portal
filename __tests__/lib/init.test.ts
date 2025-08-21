// @ts-nocheck
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockInitializeFirebase = jest.fn();
const mockInitializeDatabase = jest.fn();
const mockInitializeCollectionsWithSampleData = jest.fn();

jest.mock('../../lib/firebase', () => ({
  initializeFirebase: mockInitializeFirebase,
  initializeDatabase: mockInitializeDatabase
}));

jest.mock('../../lib/collections', () => ({
  initializeCollectionsWithSampleData: mockInitializeCollectionsWithSampleData
}));

// Mock console methods to capture output
const originalConsole = {
  log: console.log,
  error: console.error
};

// Mock environment
const originalEnv = process.env;

describe('init module', () => {
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockInitializeFirebase.mockReset();
    mockInitializeDatabase.mockReset();
    mockInitializeCollectionsWithSampleData.mockReset();
    
    // Reset module registry to get fresh instance
    jest.resetModules();
    
    // Setup console mocking
    consoleLogs = [];
    consoleErrors = [];
    
    console.log = jest.fn((message: string) => {
      consoleLogs.push(message);
    });
    
    console.error = jest.fn((message: string, error?: any) => {
      if (error) {
        consoleErrors.push(`${message} ${error}`);
      } else {
        consoleErrors.push(message);
      }
    });
    
    // Setup clean environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('initializeApp', () => {
    describe('successful initialization', () => {
      it('should initialize app successfully with Firebase', async () => {
        const mockFirebaseApp = { name: 'test-app' };
        mockInitializeFirebase.mockReturnValue(mockFirebaseApp);
        mockInitializeDatabase.mockResolvedValue(undefined);
        mockInitializeCollectionsWithSampleData.mockResolvedValue(undefined);

        // Import fresh module after mocks are set up
        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(mockInitializeFirebase).toHaveBeenCalledTimes(1);
        expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
        expect(mockInitializeCollectionsWithSampleData).toHaveBeenCalledTimes(1);
        
        expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
        expect(consoleLogs).toContain('✅ Application initialization completed successfully with Firebase');
        expect(consoleErrors).toHaveLength(0);
      });

      it('should handle Firebase not available gracefully', async () => {
        mockInitializeFirebase.mockReturnValue(null);

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(mockInitializeFirebase).toHaveBeenCalledTimes(1);
        expect(mockInitializeDatabase).not.toHaveBeenCalled();
        expect(mockInitializeCollectionsWithSampleData).not.toHaveBeenCalled();
        
        expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
        expect(consoleLogs).toContain('⚠️ Application initialization completed with mock data (Firebase not available)');
        expect(consoleErrors).toHaveLength(0);
      });

      it('should skip initialization if already initialized', async () => {
        const mockFirebaseApp = { name: 'test-app' };
        mockInitializeFirebase.mockReturnValue(mockFirebaseApp);
        mockInitializeDatabase.mockResolvedValue(undefined);
        mockInitializeCollectionsWithSampleData.mockResolvedValue(undefined);

        const { initializeApp } = await import('../../lib/init');
        
        // First initialization
        await initializeApp();
        
        // Reset mock call counts but keep same module instance
        mockInitializeFirebase.mockClear();
        mockInitializeDatabase.mockClear();
        mockInitializeCollectionsWithSampleData.mockClear();
        consoleLogs.length = 0;
        consoleErrors.length = 0;

        // Second initialization attempt
        await initializeApp();

        expect(mockInitializeFirebase).not.toHaveBeenCalled();
        expect(mockInitializeDatabase).not.toHaveBeenCalled();
        expect(mockInitializeCollectionsWithSampleData).not.toHaveBeenCalled();
        
        expect(consoleLogs).toContain('🚀 Application already initialized');
        expect(consoleErrors).toHaveLength(0);
      });
    });

    describe('error handling', () => {
      it('should handle Firebase initialization errors gracefully', async () => {
        const initError = new Error('Firebase initialization failed');
        mockInitializeFirebase.mockImplementation(() => {
          throw initError;
        });

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(mockInitializeFirebase).toHaveBeenCalledTimes(1);
        expect(mockInitializeDatabase).not.toHaveBeenCalled();
        expect(mockInitializeCollectionsWithSampleData).not.toHaveBeenCalled();
        
        expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
        expect(consoleLogs).toContain('⚠️ Application will use mock data');
        expect(consoleErrors).toContain('❌ Application initialization failed: Error: Firebase initialization failed');
      });

      it('should handle database initialization errors gracefully', async () => {
        const mockFirebaseApp = { name: 'test-app' };
        const dbError = new Error('Database initialization failed');
        
        mockInitializeFirebase.mockReturnValue(mockFirebaseApp);
        mockInitializeDatabase.mockRejectedValue(dbError);

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(mockInitializeFirebase).toHaveBeenCalledTimes(1);
        expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
        expect(mockInitializeCollectionsWithSampleData).not.toHaveBeenCalled();
        
        expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
        expect(consoleLogs).toContain('⚠️ Application will use mock data');
        expect(consoleErrors).toContain('❌ Application initialization failed: Error: Database initialization failed');
      });

      it('should handle collections initialization errors gracefully', async () => {
        const mockFirebaseApp = { name: 'test-app' };
        const collectionsError = new Error('Collections initialization failed');
        
        mockInitializeFirebase.mockReturnValue(mockFirebaseApp);
        mockInitializeDatabase.mockResolvedValue(undefined);
        mockInitializeCollectionsWithSampleData.mockRejectedValue(collectionsError);

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(mockInitializeFirebase).toHaveBeenCalledTimes(1);
        expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
        expect(mockInitializeCollectionsWithSampleData).toHaveBeenCalledTimes(1);
        
        expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
        expect(consoleLogs).toContain('⚠️ Application will use mock data');
        expect(consoleErrors).toContain('❌ Application initialization failed: Error: Collections initialization failed');
      });

      it('should handle unknown errors gracefully', async () => {
        mockInitializeFirebase.mockImplementation(() => {
          throw 'Unknown error string';
        });

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
        expect(consoleLogs).toContain('⚠️ Application will use mock data');
        expect(consoleErrors).toContain('❌ Application initialization failed: Unknown error string');
      });
    });

    describe('robustness and edge cases', () => {
      it('should handle initialization with undefined Firebase app', async () => {
        mockInitializeFirebase.mockReturnValue(undefined as any);

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(consoleLogs).toContain('⚠️ Application initialization completed with mock data (Firebase not available)');
      });

      it('should handle initialization with empty Firebase app', async () => {
        mockInitializeFirebase.mockReturnValue({} as any);

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();

        expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
        expect(mockInitializeCollectionsWithSampleData).toHaveBeenCalledTimes(1);
        expect(consoleLogs).toContain('✅ Application initialization completed successfully with Firebase');
      });

      it('should maintain initialization state after errors', async () => {
        const initError = new Error('Initialization failed');
        mockInitializeFirebase.mockImplementation(() => {
          throw initError;
        });

        const { initializeApp } = await import('../../lib/init');
        await initializeApp();
        
        // Clear mocks and try again with same module instance
        mockInitializeFirebase.mockClear();
        consoleLogs.length = 0;

        await initializeApp();

        // Should not try to initialize again
        expect(mockInitializeFirebase).not.toHaveBeenCalled();
        expect(consoleLogs).toContain('🚀 Application already initialized');
      });
    });
  });

  describe('isFirebaseConfigured', () => {
    describe('configuration validation', () => {
      it('should return false when FIREBASE_PROJECT_ID is missing', async () => {
        process.env.FIREBASE_PRIVATE_KEY = 'test-key';
        process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
        delete process.env.FIREBASE_PROJECT_ID;

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should return false when FIREBASE_PRIVATE_KEY is missing', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
        delete process.env.FIREBASE_PRIVATE_KEY;

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should return false when FIREBASE_CLIENT_EMAIL is missing', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_PRIVATE_KEY = 'test-key';
        delete process.env.FIREBASE_CLIENT_EMAIL;

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should return false when all environment variables are missing', async () => {
        delete process.env.FIREBASE_PROJECT_ID;
        delete process.env.FIREBASE_PRIVATE_KEY;
        delete process.env.FIREBASE_CLIENT_EMAIL;

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should return false when environment variables are empty strings', async () => {
        process.env.FIREBASE_PROJECT_ID = '';
        process.env.FIREBASE_PRIVATE_KEY = '';
        process.env.FIREBASE_CLIENT_EMAIL = '';

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });
    });

    describe('Firebase initialization validation', () => {
      it('should return false when Firebase initialization returns null', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_PRIVATE_KEY = 'test-key';
        process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
        
        mockInitializeFirebase.mockReturnValue(null);

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should return false when Firebase initialization throws an error', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_PRIVATE_KEY = 'test-key';
        process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
        
        mockInitializeFirebase.mockImplementation(() => {
          throw new Error('Firebase configuration invalid');
        });

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
        expect(consoleLogs.some(log => log.includes('⚠️ Firebase configuration check failed:'))).toBe(true);
      });

      it('should handle network errors during Firebase check', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_PRIVATE_KEY = 'test-key';
        process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
        
        mockInitializeFirebase.mockImplementation(() => {
          const error = new Error('Network timeout');
          error.name = 'NetworkError';
          throw error;
        });

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should handle permission errors during Firebase check', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_PRIVATE_KEY = 'test-key';
        process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
        
        mockInitializeFirebase.mockImplementation(() => {
          const error = new Error('Insufficient permissions');
          error.name = 'PermissionError';
          throw error;
        });

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle undefined environment variables', async () => {
        process.env.FIREBASE_PROJECT_ID = undefined;
        process.env.FIREBASE_PRIVATE_KEY = undefined;
        process.env.FIREBASE_CLIENT_EMAIL = undefined;

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });

      it('should handle malformed environment variables', async () => {
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_PRIVATE_KEY = 'invalid-key-format';
        process.env.FIREBASE_CLIENT_EMAIL = 'invalid-email';
        
        mockInitializeFirebase.mockImplementation(() => {
          throw new Error('Invalid credentials format');
        });

        const { isFirebaseConfigured } = await import('../../lib/init');
        const result = isFirebaseConfigured();

        expect(result).toBe(false);
      });
    });
  });

  describe('getInitializationStatus', () => {
    it('should return false before initialization', async () => {
      const { getInitializationStatus } = await import('../../lib/init');
      
      const status = getInitializationStatus();
      
      expect(status).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      const mockFirebaseApp = { name: 'test-app' };
      mockInitializeFirebase.mockReturnValue(mockFirebaseApp);
      mockInitializeDatabase.mockResolvedValue(undefined);
      mockInitializeCollectionsWithSampleData.mockResolvedValue(undefined);
      
      const { initializeApp, getInitializationStatus } = await import('../../lib/init');
      
      expect(getInitializationStatus()).toBe(false);
      
      await initializeApp();
      
      expect(getInitializationStatus()).toBe(true);
    });

    it('should return true after failed initialization', async () => {
      mockInitializeFirebase.mockImplementation(() => {
        throw new Error('Initialization failed');
      });
      
      const { initializeApp, getInitializationStatus } = await import('../../lib/init');
      
      expect(getInitializationStatus()).toBe(false);
      
      await initializeApp();
      
      expect(getInitializationStatus()).toBe(true);
    });
  });

  describe('console output and error instructions', () => {
    it('should provide clear success messages', async () => {
      const mockFirebaseApp = { name: 'test-app' };
      mockInitializeFirebase.mockReturnValue(mockFirebaseApp);
      mockInitializeDatabase.mockResolvedValue(undefined);
      mockInitializeCollectionsWithSampleData.mockResolvedValue(undefined);

      const { initializeApp } = await import('../../lib/init');
      await initializeApp();

      expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
      expect(consoleLogs).toContain('✅ Application initialization completed successfully with Firebase');
    });

    it('should provide clear fallback messages when Firebase is unavailable', async () => {
      mockInitializeFirebase.mockReturnValue(null);

      const { initializeApp } = await import('../../lib/init');
      await initializeApp();

      expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
      expect(consoleLogs).toContain('⚠️ Application initialization completed with mock data (Firebase not available)');
    });

    it('should provide clear error messages and fallback instructions', async () => {
      const initError = new Error('Database connection failed');
      mockInitializeFirebase.mockReturnValue({ name: 'test-app' });
      mockInitializeDatabase.mockRejectedValue(initError);

      const { initializeApp } = await import('../../lib/init');
      await initializeApp();

      expect(consoleLogs).toContain('🚀 Initializing Cambria Portal application...');
      expect(consoleLogs).toContain('⚠️ Application will use mock data');
      expect(consoleErrors).toContain('❌ Application initialization failed: Error: Database connection failed');
    });

    it('should provide helpful debug information for Firebase configuration issues', async () => {
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'invalid-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
      
      mockInitializeFirebase.mockImplementation(() => {
        throw new Error('Invalid private key format');
      });

      const { isFirebaseConfigured } = await import('../../lib/init');
      const result = isFirebaseConfigured();

              expect(result).toBe(false);
        expect(consoleLogs.some(log => log.includes('⚠️ Firebase configuration check failed:'))).toBe(true);
    });
  });
});