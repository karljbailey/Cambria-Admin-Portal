import { usersService, ClientPermission } from './collections';

export interface PermissionCheckResult {
  hasPermission: boolean;
  permissionType?: 'read' | 'write' | 'admin';
  clientName?: string;
}

export interface ClientAccessInfo {
  clientCode: string;
  clientName: string;
  permissionType: 'read' | 'write' | 'admin';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * Permissions utility for client-specific access control
 */
export class PermissionsService {
  private static instance: PermissionsService;

  public static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  /**
   * Check if user has permission for a specific client
   */
  async checkClientPermission(
    userId: string, 
    clientCode: string, 
    requiredPermission: 'read' | 'write' | 'admin'
  ): Promise<PermissionCheckResult> {
    try {
      const hasPermission = await usersService.hasClientPermission(userId, clientCode, requiredPermission);
      
      if (hasPermission) {
        const user = await usersService.getById(userId);
        const permission = user?.clientPermissions?.find(p => p.clientCode === clientCode);
        
        return {
          hasPermission: true,
          permissionType: permission?.permissionType,
          clientName: permission?.clientName
        };
      }

      return { hasPermission: false };
    } catch (error) {
      console.error('Error checking client permission:', error);
      return { hasPermission: false };
    }
  }

  /**
   * Get all client permissions for a user
   */
  async getUserClientPermissions(userId: string): Promise<ClientAccessInfo[]> {
    try {
      const permissions = await usersService.getClientPermissions(userId);
      return permissions.map(permission => ({
        clientCode: permission.clientCode,
        clientName: permission.clientName,
        permissionType: permission.permissionType,
        grantedBy: permission.grantedBy,
        grantedAt: permission.grantedAt,
        expiresAt: permission.expiresAt
      }));
    } catch (error) {
      console.error('Error getting user client permissions:', error);
      return [];
    }
  }

  /**
   * Add client permission to user
   */
  async addClientPermission(
    userId: string,
    clientCode: string,
    clientName: string,
    permissionType: 'read' | 'write' | 'admin',
    grantedBy: string
  ): Promise<boolean> {
    try {
      const clientPermission: ClientPermission = {
        clientCode,
        clientName,
        permissionType,
        grantedBy,
        grantedAt: new Date()
      };

      await usersService.addClientPermission(userId, clientPermission);
      return true;
    } catch (error) {
      console.error('Error adding client permission:', error);
      return false;
    }
  }

  /**
   * Remove client permission from user
   */
  async removeClientPermission(userId: string, clientCode: string): Promise<boolean> {
    try {
      await usersService.removeClientPermission(userId, clientCode);
      return true;
    } catch (error) {
      console.error('Error removing client permission:', error);
      return false;
    }
  }

  /**
   * Update client permission for user
   */
  async updateClientPermission(
    userId: string,
    clientCode: string,
    permissionType: 'read' | 'write' | 'admin'
  ): Promise<boolean> {
    try {
      await usersService.updateClientPermission(userId, clientCode, permissionType);
      return true;
    } catch (error) {
      console.error('Error updating client permission:', error);
      return false;
    }
  }

  /**
   * Get accessible clients for user
   */
  async getAccessibleClients(userId: string): Promise<string[]> {
    try {
      const permissions = await usersService.getClientPermissions(userId);
      return permissions.map(p => p.clientCode);
    } catch (error) {
      console.error('Error getting accessible clients:', error);
      return [];
    }
  }

  /**
   * Check if user can access any clients
   */
  async hasAnyClientAccess(userId: string): Promise<boolean> {
    try {
      const user = await usersService.getById(userId);
      if (!user) return false;

      // Admin users have access to all clients
      if (user.role === 'admin') return true;

      // Check if user has any client permissions
      return (user.clientPermissions?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking client access:', error);
      return false;
    }
  }
}

// Export singleton instance
export const permissionsService = PermissionsService.getInstance();

// Export utility functions for common permission checks
export const permissionUtils = {
  /**
   * Check if user can read client data
   */
  async canReadClient(userId: string, clientCode: string): Promise<boolean> {
    const result = await permissionsService.checkClientPermission(userId, clientCode, 'read');
    return result.hasPermission;
  },

  /**
   * Check if user can write to client data
   */
  async canWriteClient(userId: string, clientCode: string): Promise<boolean> {
    const result = await permissionsService.checkClientPermission(userId, clientCode, 'write');
    return result.hasPermission;
  },

  /**
   * Check if user can admin client data
   */
  async canAdminClient(userId: string, clientCode: string): Promise<boolean> {
    const result = await permissionsService.checkClientPermission(userId, clientCode, 'admin');
    return result.hasPermission;
  },

  /**
   * Get user's permission level for a client
   */
  async getClientPermissionLevel(userId: string, clientCode: string): Promise<'read' | 'write' | 'admin' | null> {
    const result = await permissionsService.checkClientPermission(userId, clientCode, 'read');
    return result.permissionType || null;
  }
};

