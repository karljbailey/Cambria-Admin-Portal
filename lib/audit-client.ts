// Client-safe audit trail utility functions
// This version doesn't import Firebase and can be used in client-side components

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

// Client-side audit log function that calls the API
export async function addAuditLog(logData: Partial<AuditLogData>, currentUser?: { id: string; name: string; email: string }): Promise<boolean> {
  try {
    // Create a unique key for deduplication
    const dedupKey = `${logData.userId || 'unknown'}-${logData.action}-${logData.resource}-${logData.resourceId}-${Date.now()}`;
    
    // Check if we're in a browser environment and use sessionStorage for deduplication
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const recentLogs = JSON.parse(sessionStorage.getItem('recentAuditLogs') || '[]');
      const now = Date.now();
      const fiveSecondsAgo = now - 5000; // 5 second window
      
      // Clean old entries
      const filteredLogs = recentLogs.filter((log: any) => log.timestamp > fiveSecondsAgo);
      
      // Check for duplicate in the last 5 seconds
      const isDuplicate = filteredLogs.some((log: any) => 
        log.userId === (logData.userId || 'unknown') &&
        log.action === logData.action &&
        log.resource === logData.resource &&
        log.resourceId === logData.resourceId &&
        log.timestamp > fiveSecondsAgo
      );
      
      if (isDuplicate) {
        console.log('🔄 Skipping duplicate audit log:', logData.action, 'on', logData.resource);
        return true; // Return true to avoid error handling
      }
      
      // Add current log to recent logs
      filteredLogs.push({
        userId: logData.userId || 'unknown',
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        timestamp: now
      });
      
      sessionStorage.setItem('recentAuditLogs', JSON.stringify(filteredLogs));
    }

    // Get current user from session if not provided
    let userInfo = currentUser;
    if (!userInfo) {
      try {
        // In client context, fetch session
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        if (sessionData.authenticated && sessionData.user) {
          userInfo = {
            id: sessionData.user.id || sessionData.user.email,
            name: sessionData.user.name,
            email: sessionData.user.email
          };
        }
      } catch (error) {
        console.error('Error fetching session for audit log:', error);
        // Use defaults if session fetch fails
        userInfo = {
          id: 'unknown',
          name: 'Unknown User',
          email: 'unknown@example.com'
        };
      }
    }

    // Prepare the audit log data
    const auditData = {
      userId: userInfo?.id || logData.userId || 'unknown',
      userName: userInfo?.name || logData.userName || 'Unknown User',
      userEmail: userInfo?.email || logData.userEmail || 'unknown@example.com',
      action: logData.action || 'unknown',
      resource: logData.resource || 'unknown',
      resourceId: logData.resourceId || 'unknown',
      resourceName: logData.resourceName || 'Unknown Resource',
      details: logData.details || 'No details provided',
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
    };

    // Send audit log to API
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(auditData),
    });

    if (response.ok) {
      console.log('✅ Audit log added successfully:', auditData.action);
      return true;
    } else {
      console.error('❌ Failed to add audit log:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error adding audit log:', error);
    return false;
  }
}

// Debounce function for audit logs
function debounceAuditLog(key: string, auditFunction: () => Promise<boolean>) {
  const now = Date.now();
  const lastCall = (globalThis as any)[`lastAuditCall_${key}`] || 0;
  const debounceTime = 1000; // 1 second debounce

  if (now - lastCall < debounceTime) {
    console.log('🔄 Debouncing audit log:', key);
    return Promise.resolve(true);
  }

  (globalThis as any)[`lastAuditCall_${key}`] = now;
  return auditFunction();
}

// Audit action constants
export const AUDIT_ACTIONS = {
  // Client actions
  VIEW_CLIENT: 'view_client',
  UPDATE_CLIENT: 'update_client',
  CREATE_CLIENT: 'create_client',
  DELETE_CLIENT: 'delete_client',
  TOGGLE_CLIENT: 'toggle_client',
  
  // File actions
  UPLOAD_FILE: 'upload_file',
  DOWNLOAD_FILE: 'download_file',
  DELETE_FILE: 'delete_file',
  VIEW_FILE: 'view_file',
  
  // Folder actions
  CREATE_FOLDER: 'create_folder',
  VIEW_FOLDER: 'view_folder',
  DELETE_FOLDER: 'delete_folder',
  
  // User actions
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  VIEW_USER: 'view_user',
  UPDATE_PERMISSIONS: 'update_permissions',
  
  // Authentication actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  RESET_PASSWORD: 'reset_password',
  FORGOT_PASSWORD: 'forgot_password',
  
  // System actions
  VIEW_AUDIT_LOG: 'view_audit_log',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  
  // Permission actions
  GRANT_PERMISSION: 'grant_permission',
  REVOKE_PERMISSION: 'revoke_permission',
  UPDATE_PERMISSION: 'update_permission'
} as const;

// Audit resource constants
export const AUDIT_RESOURCES = {
  CLIENT: 'client',
  FILE: 'file',
  FOLDER: 'folder',
  USER: 'user',
  AUTH: 'auth',
  AUDIT: 'audit',
  PERMISSION: 'permission',
  SYSTEM: 'system'
} as const;

// Audit helper functions for common actions
export const auditHelpers = {
  // Client audit helpers
  clientViewed: (clientName: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.VIEW_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Viewed client: ${clientName} (${clientCode})`
    }),

  clientUpdated: (clientName: string, clientCode: string, changes: string) => {
    const key = `client-updated-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.UPDATE_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Updated client: ${changes}`
    }));
  },

  clientCreated: (clientName: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.CREATE_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Created new client: ${clientName} (${clientCode})`
    }),

  clientDeleted: (clientName: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.DELETE_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Deleted client: ${clientName} (${clientCode})`
    }),

  clientToggled: (clientName: string, clientCode: string, newStatus: boolean) => {
    const key = `client-toggled-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.TOGGLE_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Toggled client status to: ${newStatus ? 'active' : 'inactive'}`
    }));
  },

  // File audit helpers
  fileUploaded: (fileName: string, fileSize: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.UPLOAD_FILE,
      resource: AUDIT_RESOURCES.FILE,
      resourceId: `file_${Date.now()}`,
      resourceName: fileName,
      details: `Uploaded file (${fileSize}) for client: ${clientCode}`
    }),

  fileDownloaded: (fileName: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.DOWNLOAD_FILE,
      resource: AUDIT_RESOURCES.FILE,
      resourceId: `file_${Date.now()}`,
      resourceName: fileName,
      details: `Downloaded file for client: ${clientCode}`
    }),

  fileDeleted: (fileName: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.DELETE_FILE,
      resource: AUDIT_RESOURCES.FILE,
      resourceId: `file_${Date.now()}`,
      resourceName: fileName,
      details: `Deleted file for client: ${clientCode}`
    }),

  fileViewed: (fileName: string, clientCode: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.VIEW_FILE,
      resource: AUDIT_RESOURCES.FILE,
      resourceId: `file_${Date.now()}`,
      resourceName: fileName,
      details: `Viewed file for client: ${clientCode}`
    }),

  // Folder audit helpers
  folderCreated: (folderName: string, parentFolder: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.CREATE_FOLDER,
      resource: AUDIT_RESOURCES.FOLDER,
      resourceId: `folder_${Date.now()}`,
      resourceName: folderName,
      details: `Created new folder in: ${parentFolder}`
    }),

  folderViewed: (folderName: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.VIEW_FOLDER,
      resource: AUDIT_RESOURCES.FOLDER,
      resourceId: `folder_${Date.now()}`,
      resourceName: folderName,
      details: 'Viewed folder contents'
    }),

  // Permission audit helpers
  permissionsUpdated: (targetUserName: string, oldPermission: string, newPermission: string) => {
    const key = `permissions-updated-${targetUserName}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.UPDATE_PERMISSIONS,
      resource: AUDIT_RESOURCES.USER,
      resourceId: `user_${Date.now()}`,
      resourceName: targetUserName,
      details: `Changed user permissions from ${oldPermission} to ${newPermission}`
    }));
  },

  userCreated: (userName: string, userEmail: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-created-${userEmail}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.CREATE_USER,
      resource: AUDIT_RESOURCES.USER,
      resourceId: `user_${Date.now()}`,
      resourceName: userName,
      details: `Created new user: ${userEmail}`
    }, currentUser));
  },

  userDeleted: (userName: string, currentUser?: { id: string; name: string; email: string }) => {
    const key = `user-deleted-${userName}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.DELETE_USER,
      resource: AUDIT_RESOURCES.USER,
      resourceId: `user_${Date.now()}`,
      resourceName: userName,
      details: 'Deleted user account'
    }, currentUser));
  },

  userViewed: (userName: string, userEmail: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.VIEW_USER,
      resource: AUDIT_RESOURCES.USER,
      resourceId: `user_${Date.now()}`,
      resourceName: userName,
      details: `Viewed user profile: ${userEmail}`
    }),

  // System audit helpers
  auditLogViewed: (filters: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.VIEW_AUDIT_LOG,
      resource: AUDIT_RESOURCES.AUDIT,
      resourceId: 'audit',
      resourceName: 'Audit Trail',
      details: `Viewed audit trail with filters: ${filters}`
    }),

  userLoggedIn: (userEmail: string, userName: string, userAgent: string) =>
    addAuditLog({
      userId: userEmail,
      userName: userName,
      userEmail: userEmail,
      action: AUDIT_ACTIONS.LOGIN,
      resource: AUDIT_RESOURCES.AUTH,
      resourceId: 'auth',
      resourceName: 'Authentication',
      details: `User logged in successfully`,
      userAgent: userAgent
    }),

  userLoggedOut: (userEmail: string, userName: string, userAgent: string) =>
    addAuditLog({
      userId: userEmail,
      userName: userName,
      userEmail: userEmail,
      action: AUDIT_ACTIONS.LOGOUT,
      resource: AUDIT_RESOURCES.AUTH,
      resourceId: 'auth',
      resourceName: 'Authentication',
      details: `User logged out`,
      userAgent: userAgent
    })
};
