import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { auditLogsService, AuditLog } from '@/lib/collections';
import { addAuditLog } from '@/lib/audit-utils';

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

// Mock audit trail data (fallback when Firebase is not configured)
const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    timestamp: new Date('2025-01-15T10:30:00Z').toISOString(),
    userId: 'user1',
    userName: 'John Admin',
    userEmail: 'john@cambria.com',
    action: 'CREATE_CLIENT',
    resource: 'Client',
    resourceId: 'CAM',
    resourceName: 'Cambria AI Project',
    details: 'Created new client with folder ID: 1t0qhM3bxcgxzp74ZoaDamZc43hl8WCqn',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  },
  {
    id: '2',
    timestamp: new Date('2025-01-15T11:15:00Z').toISOString(),
    userId: 'user2',
    userName: 'Sarah Manager',
    userEmail: 'sarah@cambria.com',
    action: 'VIEW_CLIENT',
    resource: 'Client',
    resourceId: 'CAM',
    resourceName: 'Cambria AI Project',
    details: 'Viewed client dashboard and monthly reports',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: '3',
    timestamp: new Date('2025-01-15T12:00:00Z').toISOString(),
    userId: 'user1',
    userName: 'John Admin',
    userEmail: 'john@cambria.com',
    action: 'UPLOAD_FILE',
    resource: 'File',
    resourceId: 'file123',
    resourceName: 'Monthly-Report_2025-01.xlsx',
    details: 'Uploaded monthly report to folder: 2025-01',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  },
  {
    id: '4',
    timestamp: new Date('2025-01-15T13:30:00Z').toISOString(),
    userId: 'user3',
    userName: 'Mike Analyst',
    userEmail: 'mike@cambria.com',
    action: 'UPDATE_CLIENT',
    resource: 'Client',
    resourceId: 'ERG',
    resourceName: 'ERGO Corporation',
    details: 'Updated ACOS goal from 25% to 30%',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  },
  {
    id: '5',
    timestamp: new Date('2025-01-15T14:15:00Z').toISOString(),
    userId: 'user2',
    userName: 'Sarah Manager',
    userEmail: 'sarah@cambria.com',
    action: 'TOGGLE_CLIENT_STATUS',
    resource: 'Client',
    resourceId: 'LOU',
    resourceName: 'Loungeface Industries',
    details: 'Set client status to inactive',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
];



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const resource = searchParams.get('resource');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    let logs: AuditLog[] = [];

    if (isFirebaseConfigured()) {
      // Use Firebase
      logs = await auditLogsService.getAll();
      console.log(`📊 Retrieved ${logs.length} audit logs from Firebase`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      logs = [...mockAuditLogs];
    }

    let filteredLogs = logs;

    // Apply filters
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userName === userId);
    }

    if (resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === resource);
    }

    if (startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    // Get unique values for filters
    const actions = [...new Set(logs.map(log => log.action))];
    const users = [...new Set(logs.map(log => ({ id: log.userId, name: log.userName, email: log.userEmail })))];
    const resources = [...new Set(logs.map(log => log.resource))];

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        total: filteredLogs.length,
        page,
        limit,
        totalPages: Math.ceil(filteredLogs.length / limit)
      },
      filters: {
        actions,
        users,
        resources
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newLog = await addAuditLog(body);
    return NextResponse.json(newLog);
  } catch (error) {
    console.error('Error adding audit log:', error);
    return NextResponse.json({ error: 'Failed to add audit log' }, { status: 500 });
  }
}
