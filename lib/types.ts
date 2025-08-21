// Define resource types that can be protected
export type ResourceType = 'users' | 'permissions' | 'audit' | 'clients' | 'files' | 'folders' | 'settings';

// Define action types
export type ActionType = 'read' | 'write' | 'delete' | 'create' | 'admin';

// Define permission levels
export type PermissionLevel = 'admin' | 'read' | 'write' | 'none';

// Interface for user permissions
export interface UserPermissions {
  userId: string;
  permissions: {
    [resource in ResourceType]: PermissionLevel;
  };
  isAdmin: boolean;
}

// Interface for permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  level: PermissionLevel;
}
