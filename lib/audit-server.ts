// Server-only audit trail utility functions
// This file should only be imported in API routes and server components

import { auditLogsService } from './collections';

export interface AuditLogData {
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
}

// Server-side audit log function that directly calls the service
export async function addAuditLog(logData: Partial<AuditLogData>, currentUser?: { id: string; name: string; email: string }): Promise<boolean> {
  try {
    // Get current user from session if not provided
    let userInfo = currentUser;
    if (!userInfo) {
      // In server context, use system defaults
      userInfo = {
        id: 'system',
        name: 'System',
        email: 'system@cambria.com'
      };
    }

    const auditLog: Omit<AuditLogData, 'id' | 'timestamp' | 'created_at' | 'updated_at'> = {
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: logData.action || 'unknown',
      resource: logData.resource || 'unknown',
      resourceId: logData.resourceId || 'unknown',
      resourceName: logData.resourceName || 'unknown',
      details: logData.details || 'No details provided',
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
    };

    await auditLogsService.add(auditLog);
    return true;
  } catch (error) {
    console.error('Error adding audit log:', error);
    return false;
  }
}

// Server-side audit helpers
export const auditHelpers = {
  // User management audit logs
  userCreated: async (userName: string, userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'created',
      resource: 'user',
      resourceId: userEmail,
      resourceName: userName,
      details: `User account created for ${userName} (${userEmail})`
    }, currentUser);
  },

  userDeleted: async (userName: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'deleted',
      resource: 'user',
      resourceId: userName,
      resourceName: userName,
      details: `User account deleted: ${userName}`
    }, currentUser);
  },

  userUpdated: async (userName: string, userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'updated',
      resource: 'user',
      resourceId: userEmail,
      resourceName: userName,
      details: `User account updated: ${userName} (${userEmail})`
    }, currentUser);
  },

  // Permission management audit logs
  permissionsUpdated: async (userId: string, userName: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'updated',
      resource: 'permissions',
      resourceId: userId,
      resourceName: userName,
      details: `Permissions updated for user: ${userName}`
    }, currentUser);
  },

  // Client management audit logs
  clientCreated: async (clientCode: string, clientName: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'created',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client created: ${clientName} (${clientCode})`
    }, currentUser);
  },

  clientUpdated: async (clientCode: string, clientName: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'updated',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client updated: ${clientName} (${clientCode})`
    }, currentUser);
  },

  clientStatusToggled: async (clientCode: string, clientName: string, newStatus: boolean, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'status_changed',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client status changed to ${newStatus ? 'active' : 'inactive'}: ${clientName} (${clientCode})`
    }, currentUser);
  },

  clientViewed: async (clientCode: string, clientName: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'viewed',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client viewed: ${clientName} (${clientCode})`
    }, currentUser);
  },

  // File upload audit logs
  fileUploaded: async (fileName: string, folderId: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'uploaded',
      resource: 'file',
      resourceId: fileName,
      resourceName: fileName,
      details: `File uploaded: ${fileName} to folder ${folderId}`
    }, currentUser);
  },

  // Login/logout audit logs
  userLogin: async (userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'login',
      resource: 'auth',
      resourceId: userEmail,
      resourceName: userEmail,
      details: `User logged in: ${userEmail}`
    }, currentUser);
  },

  userLogout: async (userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'logout',
      resource: 'auth',
      resourceId: userEmail,
      resourceName: userEmail,
      details: `User logged out: ${userEmail}`
    }, currentUser);
  },

  // Password reset audit logs
  passwordReset: async (userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'password_reset',
      resource: 'auth',
      resourceId: userEmail,
      resourceName: userEmail,
      details: `Password reset requested for: ${userEmail}`
    }, currentUser);
  },

  // Generic audit log function
  logAction: async (action: string, resource: string, resourceId: string, resourceName: string, details: string, currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action,
      resource,
      resourceId,
      resourceName,
      details
    }, currentUser);
  },

  // Audit log viewing
  auditLogViewed: async (currentUser?: { id: string; name: string; email: string }) => {
    return addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'viewed',
      resource: 'audit_logs',
      resourceId: 'all',
      resourceName: 'Audit Logs',
      details: 'Audit logs page viewed'
    }, currentUser);
  }
};
