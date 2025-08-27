// Client-safe audit trail utility functions

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

// Debounce utility for audit logs
const auditDebounceMap = new Map<string, NodeJS.Timeout>();

const debounceAuditLog = (key: string, callback: () => Promise<boolean>, delay: number = 1000): Promise<boolean> => {
  return new Promise((resolve) => {
    // Clear existing timeout
    if (auditDebounceMap.has(key)) {
      clearTimeout(auditDebounceMap.get(key)!);
    }
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      auditDebounceMap.delete(key);
      const result = await callback();
      resolve(result);
    }, delay);
    
    auditDebounceMap.set(key, timeout);
  });
};

// Client-side audit log function that calls the API
const addAuditLogClient = async (logData: Partial<AuditLogData>): Promise<boolean> => {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    });

    if (response.ok) {
      return true;
    } else {
      console.error('Failed to add audit log:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error adding audit log:', error);
    return false;
  }
};

// Client-side audit helpers
export const auditHelpers = {
  // User management audit logs
  userCreated: async (userName: string, userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-created-${userEmail}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'created',
      resource: 'user',
      resourceId: userEmail,
      resourceName: userName,
      details: `User account created for ${userName} (${userEmail})`
    }));
  },

  userDeleted: async (userName: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-deleted-${userName}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'deleted',
      resource: 'user',
      resourceId: userName,
      resourceName: userName,
      details: `User account deleted: ${userName}`
    }));
  },

  userUpdated: async (userName: string, userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-updated-${userEmail}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'updated',
      resource: 'user',
      resourceId: userEmail,
      resourceName: userName,
      details: `User account updated: ${userName} (${userEmail})`
    }));
  },

  // Permission management audit logs
  permissionsUpdated: async (userId: string, userName: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `permissions-updated-${userId}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'updated',
      resource: 'permissions',
      resourceId: userId,
      resourceName: userName,
      details: `Permissions updated for user: ${userName}`
    }));
  },

  // Client management audit logs
  clientCreated: async (clientCode: string, clientName: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `client-created-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'created',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client created: ${clientName} (${clientCode})`
    }));
  },

  clientUpdated: async (clientCode: string, clientName: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `client-updated-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'updated',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client updated: ${clientName} (${clientCode})`
    }));
  },

  clientStatusToggled: async (clientCode: string, clientName: string, newStatus: boolean, currentUser?: { id: string; name: string; email: string }) => {
    const key = `client-status-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'status_changed',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client status changed to ${newStatus ? 'active' : 'inactive'}: ${clientName} (${clientCode})`
    }));
  },

  clientViewed: async (clientCode: string, clientName: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `client-viewed-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'viewed',
      resource: 'client',
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client viewed: ${clientName} (${clientCode})`
    }));
  },

  // File upload audit logs
  fileUploaded: async (fileName: string, folderId: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `file-uploaded-${fileName}-${folderId}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'uploaded',
      resource: 'file',
      resourceId: fileName,
      resourceName: fileName,
      details: `File uploaded: ${fileName} to folder ${folderId}`
    }));
  },

  // Login/logout audit logs
  userLogin: async (userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-login-${userEmail}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'login',
      resource: 'auth',
      resourceId: userEmail,
      resourceName: userEmail,
      details: `User logged in: ${userEmail}`
    }));
  },

  userLogout: async (userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-logout-${userEmail}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'logout',
      resource: 'auth',
      resourceId: userEmail,
      resourceName: userEmail,
      details: `User logged out: ${userEmail}`
    }));
  },

  // Password reset audit logs
  passwordReset: async (userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `password-reset-${userEmail}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'password_reset',
      resource: 'auth',
      resourceId: userEmail,
      resourceName: userEmail,
      details: `Password reset requested for: ${userEmail}`
    }));
  },

  // Generic audit log function
  logAction: async (action: string, resource: string, resourceId: string, resourceName: string, details: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `${action}-${resource}-${resourceId}`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action,
      resource,
      resourceId,
      resourceName,
      details
    }));
  },

  // Audit log viewing
  auditLogViewed: async (currentUser?: { id: string; name: string; email: string }) => {
    const key = `audit-log-viewed`;
    return debounceAuditLog(key, () => addAuditLogClient({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userEmail: currentUser?.email || 'unknown@example.com',
      action: 'viewed',
      resource: 'audit_logs',
      resourceId: 'all',
      resourceName: 'Audit Logs',
      details: 'Audit logs page viewed'
    }));
  }
};
