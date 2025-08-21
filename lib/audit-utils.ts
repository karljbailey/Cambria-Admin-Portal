import { isFirebaseConfigured } from './init';
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

export async function addAuditLog(logData: AuditLogData) {
  try {
    // Validate required fields
    if (!logData.userId || !logData.userName || !logData.userEmail || 
        !logData.action || !logData.resource || !logData.resourceId || 
        !logData.resourceName || !logData.details) {
      throw new Error('Missing required fields for audit log');
    }

    const newLog = {
      ...logData,
      timestamp: new Date().toISOString(),
      ipAddress: logData.ipAddress?.trim() || 'N/A',
      userAgent: logData.userAgent?.trim() || 'N/A'
    };

    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Cannot add audit log.');
    }

    // Use Firebase only
    const auditLog = await auditLogsService.add(newLog);
    console.log(`📝 Added audit log for user ${logData.userId} - ${logData.action} on ${logData.resource}`);
    return auditLog;
  } catch (error) {
    console.error('Error adding audit log:', error);
    throw error;
  }
}
