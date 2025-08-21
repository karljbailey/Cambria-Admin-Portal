import React, { useState, useEffect, useCallback } from 'react';
import { rbacClientService, ResourceType, ActionType, PermissionLevel, UserPermissions } from '../rbac-client';

interface UseRBACOptions {
  userId?: string;
  userRole?: 'admin' | 'basic';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRBACReturn {
  // Permission checking functions
  canRead: (resource: ResourceType) => boolean;
  canWrite: (resource: ResourceType) => boolean;
  canCreate: (resource: ResourceType) => boolean;
  canDelete: (resource: ResourceType) => boolean;
  isAdmin: (resource: ResourceType) => boolean;
  getPermissionLevel: (resource: ResourceType) => PermissionLevel;
  
  // State
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshPermissions: () => Promise<void>;
  checkPermission: (resource: ResourceType, action: ActionType) => boolean;
}

/**
 * React hook for using RBAC functionality (client-safe version)
 */
export function useRBAC(options: UseRBACOptions = {}): UseRBACReturn {
  const { 
    userId, 
    userRole = 'basic', 
    autoRefresh = true, 
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = options;

  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionCache, setPermissionCache] = useState<Map<string, boolean>>(new Map());

  // Load user permissions
  const loadPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userPermissions = await rbacClientService.getUserPermissions(userId, userRole);
      setPermissions(userPermissions);
      
      // Clear permission cache when permissions change
      setPermissionCache(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    if (userId) {
      rbacClientService.clearUserCache(userId);
      await loadPermissions();
    }
  }, [userId, loadPermissions]);

  // Check permission with caching
  const checkPermission = useCallback((resource: ResourceType, action: ActionType): boolean => {
    if (!permissions) return false;
    
    const cacheKey = `${resource}:${action}`;
    const cached = permissionCache.get(cacheKey);
    
    if (cached !== undefined) {
      return cached;
    }

    const resourcePermission = permissions.permissions[resource];
    let allowed = false;

    // Admin users have full access
    if (permissions.isAdmin) {
      allowed = true;
    } else {
      // Check permission hierarchy
      switch (resourcePermission) {
        case 'admin':
          allowed = true;
          break;
        case 'write':
          allowed = ['read', 'write', 'create'].includes(action);
          break;
        case 'read':
          allowed = action === 'read';
          break;
        case 'none':
        default:
          allowed = false;
          break;
      }
    }

    // Cache the result
    setPermissionCache(prev => new Map(prev).set(cacheKey, allowed));
    return allowed;
  }, [permissions, permissionCache]);

  // Permission checking functions
  const canRead = useCallback((resource: ResourceType): boolean => {
    return checkPermission(resource, 'read');
  }, [checkPermission]);

  const canWrite = useCallback((resource: ResourceType): boolean => {
    return checkPermission(resource, 'write');
  }, [checkPermission]);

  const canCreate = useCallback((resource: ResourceType): boolean => {
    return checkPermission(resource, 'create');
  }, [checkPermission]);

  const canDelete = useCallback((resource: ResourceType): boolean => {
    return checkPermission(resource, 'delete');
  }, [checkPermission]);

  const isAdmin = useCallback((resource: ResourceType): boolean => {
    return checkPermission(resource, 'admin');
  }, [checkPermission]);

  const getPermissionLevel = useCallback((resource: ResourceType): PermissionLevel => {
    return permissions?.permissions[resource] || 'none';
  }, [permissions]);

  // Load permissions on mount and when userId/userRole changes
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Auto-refresh permissions
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      refreshPermissions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, userId, refreshInterval, refreshPermissions]);

  return {
    canRead,
    canWrite,
    canCreate,
    canDelete,
    isAdmin,
    getPermissionLevel,
    permissions,
    loading,
    error,
    refreshPermissions,
    checkPermission
  };
}

/**
 * HOC for protecting components based on RBAC permissions
 */
export function withRBAC<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: { resource: ResourceType; action: ActionType },
  fallback?: React.ComponentType
) {
  return function RBACProtectedComponent(props: P & { userId?: string; userRole?: 'admin' | 'basic' }) {
    const { userId, userRole, ...componentProps } = props;
    const { checkPermission, loading, error } = useRBAC({ userId, userRole });

    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading permissions...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 text-red-600">
          Error loading permissions: {error}
        </div>
      );
    }

    const hasPermission = checkPermission(requiredPermission.resource, requiredPermission.action);

    if (!hasPermission) {
      if (fallback) {
        return React.createElement(fallback, props);
      }
      
      return (
        <div className="p-4 text-red-600">
          <p>You don&apos;t have permission to access this resource.</p>
          <p>Required: {requiredPermission.action} access to {requiredPermission.resource}</p>
        </div>
      );
    }

    return React.createElement(WrappedComponent, componentProps as P);
  };
}

/**
 * Hook for checking page access permissions
 */
export function usePageAccess(userId?: string, userRole?: 'admin' | 'basic') {
  const { canRead, loading } = useRBAC({ userId, userRole });

  const canAccessPage = useCallback((page: ResourceType): boolean => {
    return canRead(page);
  }, [canRead]);

  return {
    canAccessPage,
    loading
  };
}
