# Cambria Dashboard Features

## 🔍 Audit System

The audit system provides comprehensive tracking and logging of all user actions and system events within the Cambria Dashboard.

### What Audit Does

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Action Tracking** | Records every user action with timestamps, user info, and context | `addAuditLog()` function with detailed metadata |
| **User Attribution** | Links all actions to specific users with ID, name, and email | Session-based user detection with fallback handling |
| **Resource Monitoring** | Tracks which resources (files, folders, users) are affected | Resource ID, name, and type tracking |
| **IP & User Agent Logging** | Records client IP addresses and browser information | Automatic detection with configurable fallbacks |
| **Error Handling** | Graceful handling of network failures and missing data | Robust error recovery with fallback values |
| **API Integration** | Seamless integration with backend audit endpoints | RESTful API calls with proper error handling |
| **Session Management** | Automatic user session detection when not provided | Fetch-based session retrieval with error handling |

### What Audit Can Manage

#### 📁 File Management
| Action | Resource | Details Tracked |
|--------|----------|----------------|
| `UPLOAD_FILE` | File | File name, size, type, upload location |
| `DELETE_FILE` | File | File name, deletion reason, permissions |
| `VIEW_FILE` | File | File access, user permissions, download tracking |
| `DOWNLOAD_FILE` | File | Download count, user info, file metadata |

#### 📂 Folder Management
| Action | Resource | Details Tracked |
|--------|----------|----------------|
| `CREATE_FOLDER` | Folder | Folder name, parent folder, permissions |
| `DELETE_FOLDER` | Folder | Folder contents, deletion cascade, permissions |
| `VIEW_FOLDER` | Folder | Folder access, contents listing, user permissions |
| `UPDATE_FOLDER` | Folder | Folder name changes, permission updates |

#### 👥 Client Management
| Action | Resource | Details Tracked |
|--------|----------|----------------|
| `CREATE_CLIENT` | Client | Client code, name, folder assignment |
| `UPDATE_CLIENT` | Client | Field changes, update history, modified by |
| `DELETE_CLIENT` | Client | Deletion reason, associated data cleanup |
| `TOGGLE_CLIENT_STATUS` | Client | Status changes, activation/deactivation |
| `VIEW_CLIENT` | Client | Access tracking, permission verification |

#### 🔐 User & Permission Management
| Action | Resource | Details Tracked |
|--------|----------|----------------|
| `CREATE_USER` | User | User creation, initial permissions, admin approval |
| `DELETE_USER` | User | User removal, permission cleanup, data handling |
| `UPDATE_PERMISSIONS` | User | Permission changes, scope modifications |
| `LOGIN` | Auth | Login attempts, success/failure, IP tracking |
| `LOGOUT` | Auth | Session termination, logout time |

#### 📊 System Operations
| Action | Resource | Details Tracked |
|--------|----------|----------------|
| `VIEW_AUDIT_LOG` | Audit | Audit log access, filtering, export requests |
| `EXPORT_DATA` | System | Data export requests, format, scope |
| `SYSTEM_CONFIG` | System | Configuration changes, admin actions |
| `BACKUP_OPERATION` | System | Backup creation, restoration, verification |

### Audit Data Structure

```typescript
interface AuditLogData {
  userId: string;        // User who performed the action
  userName: string;      // Human-readable user name
  userEmail: string;     // User's email address
  action: string;        // Type of action performed
  resource: string;      // Resource type (File, Folder, User, etc.)
  resourceId: string;    // Unique identifier for the resource
  resourceName: string;  // Human-readable resource name
  details: string;       // Detailed description of the action
  ipAddress?: string;    // Client IP address
  userAgent?: string;    // Browser/client information
}
```

### Predefined Audit Actions

```typescript
const AUDIT_ACTIONS = {
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
  
  // System actions
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT_DATA: 'EXPORT_DATA'
}
```

### Predefined Resources

```typescript
const AUDIT_RESOURCES = {
  CLIENT: 'Client',
  FILE: 'File',
  FOLDER: 'Folder',
  USER: 'User',
  AUDIT: 'Audit',
  AUTH: 'Auth',
  SYSTEM: 'System'
}
```

### Helper Functions

The audit system provides helper functions for common scenarios:

```typescript
const auditHelpers = {
  // Client audit helpers
  clientCreated: (clientCode: string, clientName: string, folderId: string) => 
    addAuditLog({...}),
  
  clientUpdated: (clientCode: string, clientName: string, details: string) =>
    addAuditLog({...}),
  
  // File audit helpers
  fileUploaded: (fileName: string, fileSize: number, folderId: string) =>
    addAuditLog({...}),
  
  // User audit helpers
  userLoggedIn: (userId: string, userEmail: string) =>
    addAuditLog({...})
}
```

### Error Handling & Resilience

| Scenario | Handling | Fallback |
|----------|----------|----------|
| **Network Failure** | Graceful degradation | Continues operation without audit logging |
| **Missing User Data** | Session fallback | Uses 'unknown' user with IP tracking |
| **API Errors** | Error logging | Returns false, logs error details |
| **Invalid Data** | Validation | Uses fallback values for missing fields |
| **Session Unavailable** | Error handling | Proceeds with available data |

### Security Features

- **IP Address Tracking**: Records client IP addresses for security monitoring
- **User Agent Logging**: Tracks browser/client information for fraud detection
- **Permission Verification**: Ensures users can only audit actions they're authorized for
- **Data Integrity**: Validates all audit data before storage
- **Error Recovery**: Prevents audit system failures from affecting main application

### Performance Considerations

- **Asynchronous Logging**: Audit operations don't block main application flow
- **Batch Processing**: Multiple audit events can be processed efficiently
- **Minimal Overhead**: Lightweight implementation with minimal performance impact
- **Caching**: Session data caching to reduce API calls
- **Error Isolation**: Audit failures don't affect core application functionality
