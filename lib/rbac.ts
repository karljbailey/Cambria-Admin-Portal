import { permissionsService } from './collections';
import { ResourceType, ActionType, PermissionLevel, UserPermissions, PermissionCheckResult } from './types';

// Default permissions for different user roles
const DEFAULT_PERMISSIONS = {
  admin: {
    users: 'admin' as PermissionLevel,
    permissions: 'admin' as PermissionLevel,
    audit: 'admin' as PermissionLevel,
    clients: 'admin' as PermissionLevel,
    files: 'admin' as PermissionLevel,
    folders: 'admin' as PermissionLevel,
    settings: 'admin' as PermissionLevel,
  },
  basic: {
    users: 'none' as PermissionLevel,
    permissions: 'none' as PermissionLevel,
    audit: 'none' as PermissionLevel,
    clients: 'read' as PermissionLevel,
    files: 'read' as PermissionLevel,
    folders: 'read' as PermissionLevel,
    settings: 'none' as PermissionLevel,
  }
};

// Permission hierarchy (higher levels include lower levels)
const PERMISSION_HIERARCHY: { [key in PermissionLevel]: PermissionLevel[] } = {
  admin: ['admin', 'write', 'read', 'none'],
  write: ['write', 'read', 'none'],
  read: ['read', 'none'],
  none: ['none']
};

/**
 * RBAC Service for handling role-based access control
 */
export class RBACService {
  private static instance: RBACService;
  private userPermissionsCache: Map<string, UserPermissions> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Get user permissions from database and cache them
   */
  async getUserPermissions(userId: string, userRole: 'admin' | 'basic'): Promise<UserPermissions> {
    const now = Date.now();
    const cached = this.userPermissionsCache.get(userId);
    const expiry = this.cacheExpiry.get(userId);

    // Return cached permissions if still valid
    if (cached && expiry && now < expiry) {
      return cached;
    }

    // Clear expired cache
    if (expiry && now >= expiry) {
      this.userPermissionsCache.delete(userId);
      this.cacheExpiry.delete(userId);
    }

    let permissions: UserPermissions;

    if (userRole === 'admin') {
      // Admin users have full access
      permissions = {
        userId,
        permissions: { ...DEFAULT_PERMISSIONS.admin },
        isAdmin: true
      };
    } else {
      // Basic users get permissions from database
      try {
        const dbPermissions = await permissionsService.getByUser(userId);
        permissions = this.buildUserPermissions(userId, dbPermissions);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        // Fallback to default basic permissions
        permissions = {
          userId,
          permissions: { ...DEFAULT_PERMISSIONS.basic },
          isAdmin: false
        };
      }
    }

    // Cache the permissions
    this.userPermissionsCache.set(userId, permissions);
    this.cacheExpiry.set(userId, now + this.CACHE_DURATION);

    return permissions;
  }

  /**
   * Build user permissions from database permissions
   */
  private buildUserPermissions(userId: string, dbPermissions: any[]): UserPermissions {
    const permissions = { ...DEFAULT_PERMISSIONS.basic };

    // Process database permissions
    for (const perm of dbPermissions) {
      if (perm.permissionType && perm.resource) {
        const resource = perm.resource as ResourceType;
        const level = perm.permissionType as PermissionLevel;
        
        // Only update if the new permission is higher in hierarchy
        if (this.isHigherPermission(level, permissions[resource])) {
          permissions[resource] = level;
        }
      }
    }

    return {
      userId,
      permissions,
      isAdmin: false
    };
  }

  /**
   * Check if a permission level is higher than another
   */
  private isHigherPermission(newLevel: PermissionLevel, currentLevel: PermissionLevel): boolean {
    const newHierarchy = PERMISSION_HIERARCHY[newLevel];
    const currentHierarchy = PERMISSION_HIERARCHY[currentLevel];
    
    return newHierarchy.indexOf(currentLevel) < currentHierarchy.indexOf(newLevel);
  }

  /**
   * Check if user has permission for a specific action on a resource
   */
  async checkPermission(
    userId: string, 
    userRole: 'admin' | 'basic',
    resource: ResourceType, 
    action: ActionType
  ): Promise<PermissionCheckResult> {
    const userPermissions = await this.getUserPermissions(userId, userRole);
    const resourcePermission = userPermissions.permissions[resource];

    // Admin users have full access
    if (userPermissions.isAdmin) {
      return {
        allowed: true,
        level: 'admin',
        reason: 'User is admin'
      };
    }

    // Check permission hierarchy
    const allowed = this.isActionAllowed(resourcePermission, action);

    return {
      allowed,
      level: resourcePermission,
      reason: allowed ? 'Permission granted' : `Insufficient permissions. Required: ${action}, Available: ${resourcePermission}`
    };
  }

  /**
   * Check if an action is allowed for a given permission level
   */
  private isActionAllowed(permissionLevel: PermissionLevel, action: ActionType): boolean {
    switch (permissionLevel) {
      case 'admin':
        return true; // Admin can do everything
      case 'write':
        return ['read', 'write', 'create'].includes(action);
      case 'read':
        return ['read'].includes(action);
      case 'none':
        return false;
      default:
        return false;
    }
  }

  /**
   * Get user's permission level for a specific resource
   */
  async getResourcePermission(
    userId: string, 
    userRole: 'admin' | 'basic',
    resource: ResourceType
  ): Promise<PermissionLevel> {
    const userPermissions = await this.getUserPermissions(userId, userRole);
    return userPermissions.permissions[resource];
  }

  /**
   * Check if user can access a specific page/route
   */
  async canAccessPage(
    userId: string, 
    userRole: 'admin' | 'basic',
    page: ResourceType
  ): Promise<boolean> {
    const result = await this.checkPermission(userId, userRole, page, 'read');
    return result.allowed;
  }

  /**
   * Clear user permissions cache (useful when permissions are updated)
   */
  clearUserCache(userId: string): void {
    this.userPermissionsCache.delete(userId);
    this.cacheExpiry.delete(userId);
  }

  /**
   * Clear all permissions cache
   */
  clearAllCache(): void {
    this.userPermissionsCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get all user permissions for debugging/logging
   */
  async getAllUserPermissions(userId: string, userRole: 'admin' | 'basic'): Promise<UserPermissions> {
    return await this.getUserPermissions(userId, userRole);
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance();

// Utility functions for common permission checks
export const rbacUtils = {
  /**
   * Check if user can read a resource
   */
  async canRead(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacService.checkPermission(userId, userRole, resource, 'read');
    return result.allowed;
  },

  /**
   * Check if user can write to a resource
   */
  async canWrite(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacService.checkPermission(userId, userRole, resource, 'write');
    return result.allowed;
  },

  /**
   * Check if user can create a resource
   */
  async canCreate(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacService.checkPermission(userId, userRole, resource, 'create');
    return result.allowed;
  },

  /**
   * Check if user can delete a resource
   */
  async canDelete(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacService.checkPermission(userId, userRole, resource, 'delete');
    return result.allowed;
  },

  /**
   * Check if user has admin access to a resource
   */
  async isAdmin(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacService.checkPermission(userId, userRole, resource, 'admin');
    return result.allowed;
  },

  /**
   * Get permission level for a resource
   */
  async getPermissionLevel(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<PermissionLevel> {
    return await rbacService.getResourcePermission(userId, userRole, resource);
  }
};

// Re-export types for backward compatibility
export type { ResourceType, ActionType, PermissionLevel, UserPermissions, PermissionCheckResult } from './types';
