import { ResourceType, ActionType, PermissionLevel, UserPermissions, PermissionCheckResult } from './types';

// Re-export types for convenience
export type { ResourceType, ActionType, PermissionLevel, UserPermissions, PermissionCheckResult };

// Default permissions for different user roles (client-side fallback)
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
 * Client-side RBAC Service for handling role-based access control
 * This version doesn't import Firebase and can be safely used in client components
 */
export class RBACClientService {
  private static instance: RBACClientService;
  private userPermissionsCache: Map<string, UserPermissions> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): RBACClientService {
    if (!RBACClientService.instance) {
      RBACClientService.instance = new RBACClientService();
    }
    return RBACClientService.instance;
  }

  /**
   * Get user permissions (client-side version using default permissions)
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

    // Use default permissions for client-side
    const permissions: UserPermissions = {
      userId,
      permissions: { ...DEFAULT_PERMISSIONS[userRole] },
      isAdmin: userRole === 'admin'
    };

    // Cache the permissions
    this.userPermissionsCache.set(userId, permissions);
    this.cacheExpiry.set(userId, now + this.CACHE_DURATION);

    return permissions;
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
        reason: 'User is admin',
        level: 'admin'
      };
    }

    // Check permission hierarchy
    const allowedLevels = PERMISSION_HIERARCHY[resourcePermission];
    const actionLevel = this.getActionLevel(action);

    const allowed = allowedLevels.includes(actionLevel);

    return {
      allowed,
      reason: allowed 
        ? `User has ${resourcePermission} permission for ${resource}`
        : `Insufficient permissions. Required: ${actionLevel}, User has: ${resourcePermission}`,
      level: resourcePermission
    };
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
   * Clear user permissions cache
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
   * Helper method to get action level
   */
  private getActionLevel(action: ActionType): PermissionLevel {
    switch (action) {
      case 'admin':
        return 'admin';
      case 'delete':
        return 'admin';
      case 'create':
        return 'write';
      case 'write':
        return 'write';
      case 'read':
        return 'read';
      default:
        return 'none';
    }
  }
}

// Export singleton instance
export const rbacClientService = RBACClientService.getInstance();

// Utility functions for common permission checks
export const rbacClientUtils = {
  /**
   * Check if user can read a resource
   */
  async canRead(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacClientService.checkPermission(userId, userRole, resource, 'read');
    return result.allowed;
  },

  /**
   * Check if user can write to a resource
   */
  async canWrite(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacClientService.checkPermission(userId, userRole, resource, 'write');
    return result.allowed;
  },

  /**
   * Check if user can create a resource
   */
  async canCreate(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacClientService.checkPermission(userId, userRole, resource, 'create');
    return result.allowed;
  },

  /**
   * Check if user can delete a resource
   */
  async canDelete(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacClientService.checkPermission(userId, userRole, resource, 'delete');
    return result.allowed;
  },

  /**
   * Check if user has admin access to a resource
   */
  async isAdmin(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<boolean> {
    const result = await rbacClientService.checkPermission(userId, userRole, resource, 'admin');
    return result.allowed;
  },

  /**
   * Get permission level for a resource
   */
  async getPermissionLevel(userId: string, userRole: 'admin' | 'basic', resource: ResourceType): Promise<PermissionLevel> {
    return await rbacClientService.getResourcePermission(userId, userRole, resource);
  }
};
