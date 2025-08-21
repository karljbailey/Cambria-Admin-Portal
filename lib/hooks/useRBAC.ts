import React, { useState, useEffect, useCallback } from 'react';
import { rbacService, ResourceType, ActionType, PermissionLevel, UserPermissions } from '../rbac';

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
 * React hook for using RBAC functionality
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
      const userPermissions = await rbacService.getUserPermissions(userId, userRole);
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
      rbacService.clearUserCache(userId);
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
          allowed = ['read'].includes(action);
          break;
        case 'none':
          allowed = false;
          break;
        default:
          allowed = false;
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

  // Load permissions on mount and when dependencies change
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
    // Permission checking functions
    canRead,
    canWrite,
    canCreate,
    canDelete,
    isAdmin,
    getPermissionLevel,
    
    // State
    permissions,
    loading,
    error,
    
    // Actions
    refreshPermissions,
    checkPermission,
  };
}

/**
 * Higher-order component for protecting components based on permissions
 */
export function withRBAC<T extends object>(
  Component: React.ComponentType<T>,
  requiredResource: ResourceType,
  requiredAction: ActionType = 'read'
) {
  return function RBACProtectedComponent(props: T & { userId?: string; userRole?: 'admin' | 'basic' }) {
    const { userId, userRole, ...componentProps } = props;
    const { checkPermission, loading, error } = useRBAC({ userId, userRole });

    if (loading) {
      return React.createElement('div', { className: "flex items-center justify-center p-4" }, "Loading permissions...");
    }

    if (error) {
      return React.createElement('div', { className: "text-red-600 p-4" }, `Error loading permissions: ${error}`);
    }

    if (!checkPermission(requiredResource, requiredAction)) {
      return React.createElement('div', { className: "text-gray-600 p-4 text-center" },
        React.createElement('p', null, "You don't have permission to access this resource."),
        React.createElement('p', { className: "text-sm" }, `Required: ${requiredAction} access to ${requiredResource}`)
      );
    }

    return React.createElement(Component, componentProps as T);
  };
}

/**
 * Hook for checking if user can access a specific page
 */
export function usePageAccess(page: ResourceType, options: UseRBACOptions = {}) {
  const { canRead, loading, error } = useRBAC(options);
  
  return {
    canAccess: canRead(page),
    loading,
    error,
  };
}
