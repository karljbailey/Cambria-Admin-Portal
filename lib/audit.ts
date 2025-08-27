// Audit trail utility functions

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

// Get current user from session (will be passed as parameter)
const getCurrentUser = () => {
  // This should be passed as parameter from the calling component
  return null;
};

// Note: IP address and user agent are now handled server-side in the API
// The API will automatically detect the real IP and user agent from the request

// Add audit log with deduplication
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
        // Check if we're in a server-side context
        const isServer = typeof window === 'undefined';
        if (isServer) {
          // In server context, we can't fetch session, so use defaults
          userInfo = {
            id: 'system',
            name: 'System',
            email: 'system@cambria.com'
          };
        } else {
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

    const fullLogData: AuditLogData = {
      userId: logData.userId || userInfo?.id || 'unknown',
      userName: logData.userName || userInfo?.name || 'Unknown User',
      userEmail: logData.userEmail || userInfo?.email || 'unknown@example.com',
      action: logData.action!,
      resource: logData.resource!,
      resourceId: logData.resourceId!,
      resourceName: logData.resourceName!,
      details: logData.details!,
      ipAddress: logData.ipAddress || 'unknown',
      userAgent: logData.userAgent || 'unknown'
    };

    // Check if we're in a server-side context
    const isServer = typeof window === 'undefined';
    if (isServer) {
      // In server context, directly add to audit logs collection
      try {
        const { auditLogsService } = await import('./collections');
        await auditLogsService.add(fullLogData);
        console.log('✅ Audit log added successfully (server-side)');
        return true;
      } catch (error) {
        console.error('Error adding audit log (server-side):', error);
        return false;
      }
    } else {
      // In client context, use fetch
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullLogData),
      });

      if (!response.ok) {
        console.error('Failed to add audit log:', response.statusText);
        return false;
      }

      const result = await response.json();
      console.log('✅ Audit log added successfully:', result.id);
      return true;
    }
  } catch (error) {
    console.error('Error adding audit log:', error);
    return false;
  }
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

// Predefined audit actions
export const AUDIT_ACTIONS = {
  // Client actions
  CREATE_CLIENT: 'CREATE_CLIENT',
  UPDATE_CLIENT: 'UPDATE_CLIENT',
  DELETE_CLIENT: 'DELETE_CLIENT',
  TOGGLE_CLIENT_STATUS: 'TOGGLE_CLIENT_STATUS',
  VIEW_CLIENT: 'VIEW_CLIENT',
  
  // File actions
  UPLOAD_FILE: 'UPLOAD_FILE',
  DELETE_FILE: 'DELETE_FILE',
  VIEW_FILE: 'VIEW_FILE',
  
  // Folder actions
  CREATE_FOLDER: 'CREATE_FOLDER',
  DELETE_FOLDER: 'DELETE_FOLDER',
  VIEW_FOLDER: 'VIEW_FOLDER',
  
  // Permission actions
  UPDATE_PERMISSIONS: 'UPDATE_PERMISSIONS',
  CREATE_USER: 'CREATE_USER',
  DELETE_USER: 'DELETE_USER',
  VIEW_USER: 'VIEW_USER',
  
  // System actions
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT_DATA: 'EXPORT_DATA'
} as const;

// Predefined resources
export const AUDIT_RESOURCES = {
  CLIENT: 'Client',
  FILE: 'File',
  FOLDER: 'Folder',
  USER: 'User',
  AUDIT: 'Audit',
  AUTH: 'Auth',
  SYSTEM: 'System'
} as const;

// Helper functions for common audit scenarios
export const auditHelpers = {
  // Client audit helpers
  clientCreated: (clientCode: string, clientName: string, folderId: string) => {
    const key = `client-created-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.CREATE_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Created new client with folder ID: ${folderId}`
    }));
  },

  clientUpdated: (clientCode: string, clientName: string, details: string) => {
    const key = `client-updated-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.UPDATE_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details
    }));
  },

  clientStatusToggled: (clientCode: string, clientName: string, newStatus: boolean) => {
    const key = `client-status-${clientCode}`;
    return debounceAuditLog(key, () => addAuditLog({
      action: AUDIT_ACTIONS.TOGGLE_CLIENT_STATUS,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: `Client status changed to ${newStatus ? 'active' : 'inactive'}`
    }));
  },

  clientViewed: (clientCode: string, clientName: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.VIEW_CLIENT,
      resource: AUDIT_RESOURCES.CLIENT,
      resourceId: clientCode,
      resourceName: clientName,
      details: 'Viewed client dashboard and monthly reports'
    }),

  // File audit helpers
  fileUploaded: (fileName: string, folderName: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.UPLOAD_FILE,
      resource: AUDIT_RESOURCES.FILE,
      resourceId: `file_${Date.now()}`,
      resourceName: fileName,
      details: `Uploaded file to folder: ${folderName}`
    }),

  fileDeleted: (fileName: string) =>
    addAuditLog({
      action: AUDIT_ACTIONS.DELETE_FILE,
      resource: AUDIT_RESOURCES.FILE,
      resourceId: `file_${Date.now()}`,
      resourceName: fileName,
      details: 'Deleted file'
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
