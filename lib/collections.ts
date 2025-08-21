import { addDocument, updateDocument, deleteDocument, getDocumentById, getAllDocuments, queryDocuments } from './firebase';
import { hashDefaultPassword } from './auth';

// TypeScript interfaces for our collections
export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface User {
  id?: string;
  email: string;
  name: string;
  passwordHash?: string;
  passwordSalt?: string;
  role: 'admin' | 'basic';
  status: 'active' | 'inactive';
  lastLogin?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface Permission {
  id?: string;
  userId: string;
  userName: string;
  permissionType: 'admin' | 'read' | 'write';
  resource?: string;
  grantedBy?: string;
  grantedAt: Date;
  expiresAt?: Date;
  created_at?: Date;
  updated_at?: Date;
}

// Collection names
export const COLLECTIONS = {
  AUDIT_LOGS: 'audit_logs',
  USERS: 'users',
  PERMISSIONS: 'permissions'
} as const;

// Audit Logs Functions
export const auditLogsService = {
  // Add new audit log
  async add(logData: Omit<AuditLog, 'id' | 'timestamp' | 'created_at' | 'updated_at'>): Promise<AuditLog> {
    const auditLog: Omit<AuditLog, 'id'> = {
      ...logData,
      timestamp: new Date().toISOString(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const docRef = await addDocument(COLLECTIONS.AUDIT_LOGS, auditLog);
    return { id: docRef.id, ...auditLog };
  },

  // Get all audit logs
  async getAll(): Promise<AuditLog[]> {
    return await getAllDocuments(COLLECTIONS.AUDIT_LOGS) as unknown as AuditLog[];
  },

  // Get audit logs by user
  async getByUser(userId: string): Promise<AuditLog[]> {
    return await queryDocuments(COLLECTIONS.AUDIT_LOGS, 'userId', '==', userId) as unknown as AuditLog[];
  },

  // Get audit logs by action
  async getByAction(action: string): Promise<AuditLog[]> {
    return await queryDocuments(COLLECTIONS.AUDIT_LOGS, 'action', '==', action) as unknown as AuditLog[];
  },

  // Get audit logs by date range
  async getByDateRange(startDate: string, endDate: string): Promise<AuditLog[]> {
    const logs = await this.getAll();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= new Date(startDate) && logDate <= new Date(endDate);
    });
  }
};

// Users Functions
export const usersService = {
  // Add new user
  async add(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const user: Omit<User, 'id'> = {
      ...userData,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const docRef = await addDocument(COLLECTIONS.USERS, user);
    return { id: docRef.id, ...user };
  },

  // Get all users
  async getAll(): Promise<User[]> {
    return await getAllDocuments(COLLECTIONS.USERS) as unknown as User[];
  },

  // Get user by ID
  async getById(userId: string): Promise<User | null> {
    return await getDocumentById(COLLECTIONS.USERS, userId) as unknown as User | null;
  },

  // Get user by email
  async getByEmail(email: string): Promise<User | null> {
    const users = await queryDocuments(COLLECTIONS.USERS, 'email', '==', email) as unknown as User[];
    return users.length > 0 ? users[0] : null;
  },

  // Update user
  async update(userId: string, userData: Partial<User>): Promise<void> {
    await updateDocument(COLLECTIONS.USERS, userId, {
      ...userData,
      updated_at: new Date()
    });
  },

  // Delete user
  async delete(userId: string): Promise<void> {
    await deleteDocument(COLLECTIONS.USERS, userId);
  },

  // Update user role
  async updateRole(userId: string, role: 'admin' | 'basic'): Promise<void> {
    await this.update(userId, { role });
  },

  // Update user status
  async updateStatus(userId: string, status: 'active' | 'inactive'): Promise<void> {
    await this.update(userId, { status });
  }
};

// Permissions Functions
export const permissionsService = {
  // Add new permission
  async add(permissionData: Omit<Permission, 'id' | 'grantedAt' | 'created_at' | 'updated_at'>): Promise<Permission> {
    const permission: Omit<Permission, 'id'> = {
      ...permissionData,
      grantedAt: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const docRef = await addDocument(COLLECTIONS.PERMISSIONS, permission);
    return { id: docRef.id, ...permission };
  },

  // Get all permissions
  async getAll(): Promise<Permission[]> {
    return await getAllDocuments(COLLECTIONS.PERMISSIONS) as unknown as Permission[];
  },

  // Get permission by ID
  async getById(permissionId: string): Promise<Permission | null> {
    return await getDocumentById(COLLECTIONS.PERMISSIONS, permissionId) as unknown as Permission | null;
  },

  // Get permissions by user
  async getByUser(userId: string): Promise<Permission[]> {
    return await queryDocuments(COLLECTIONS.PERMISSIONS, 'userId', '==', userId) as unknown as Permission[];
  },

  // Get permissions by type
  async getByType(permissionType: 'admin' | 'read' | 'write'): Promise<Permission[]> {
    return await queryDocuments(COLLECTIONS.PERMISSIONS, 'permissionType', '==', permissionType) as unknown as Permission[];
  },

  // Update permission
  async update(permissionId: string, permissionData: Partial<Permission>): Promise<void> {
    await updateDocument(COLLECTIONS.PERMISSIONS, permissionId, {
      ...permissionData,
      updated_at: new Date()
    });
  },

  // Delete permission
  async delete(permissionId: string): Promise<void> {
    await deleteDocument(COLLECTIONS.PERMISSIONS, permissionId);
  }
};

// Initialize collections with sample data
export async function initializeCollectionsWithSampleData() {
  try {
    console.log('🔧 Initializing collections with sample data...');

    // Check if collections already have data
    const existingUsers = await usersService.getAll();

    // Add sample users if none exist
    if (existingUsers.length === 0) {
      console.log('📝 Seeding sample users...');
      
      // Hash the default password for the first user
      const { hash: passwordHash, salt: passwordSalt } = await hashDefaultPassword();
      
      await usersService.add({
        email: 'integrations@flowgenius.com',
        name: 'Integrations',
        passwordHash,
        passwordSalt,
        role: 'admin',
        status: 'active'
      });

      console.log('✅ Sample users added with default password: integrate8000');
    }

    console.log('🎉 Collections initialization completed');
  } catch (error) {
    console.error('❌ Error initializing collections with sample data:', error);
    throw error;
  }
}


