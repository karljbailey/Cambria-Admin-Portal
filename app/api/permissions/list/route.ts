import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { permissionsService } from '@/lib/collections';

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

// Mock permissions data (fallback when Firebase is not configured)
const mockPermissions = [
  {
    id: '1',
    userId: 'user1',
    userName: 'John Admin',
    permissionType: 'admin' as const,
    resource: 'all',
    grantedBy: 'system',
    grantedAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: undefined,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z')
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Sarah Manager',
    permissionType: 'write' as const,
    resource: 'clients',
    grantedBy: 'user1',
    grantedAt: new Date('2024-01-05T00:00:00Z'),
    expiresAt: undefined,
    created_at: new Date('2024-01-05T00:00:00Z'),
    updated_at: new Date('2024-01-05T00:00:00Z')
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Mike Analyst',
    permissionType: 'read' as const,
    resource: 'reports',
    grantedBy: 'user1',
    grantedAt: new Date('2024-01-10T00:00:00Z'),
    expiresAt: undefined,
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-10T00:00:00Z')
  }
];

export async function GET(request: NextRequest) {
  try {
    // Handle case where request.url might be undefined in test environment
    let userId, permissionType, resource;
    
    if (!request.url) {
      // In test environment, create a default URL
      const url = 'http://localhost:3000/api/permissions/list';
      const { searchParams } = new URL(url);
      userId = searchParams.get('userId');
      permissionType = searchParams.get('permissionType');
      resource = searchParams.get('resource');
    } else {
      const { searchParams } = new URL(request.url);
      userId = searchParams.get('userId');
      permissionType = searchParams.get('permissionType');
      resource = searchParams.get('resource');
    }

    let permissions = [];

    if (isFirebaseConfigured()) {
      // Use Firebase
      try {
        if (userId) {
          // Get permissions by user
          permissions = await permissionsService.getByUser(userId);
          console.log(`📊 Retrieved ${permissions.length} permissions for user ${userId} from Firebase`);
        } else if (permissionType) {
          // Get permissions by type
          permissions = await permissionsService.getByType(permissionType as 'admin' | 'read' | 'write');
          console.log(`📊 Retrieved ${permissions.length} permissions of type ${permissionType} from Firebase`);
        } else {
          // Get all permissions
          permissions = await permissionsService.getAll();
          console.log(`📊 Retrieved ${permissions.length} permissions from Firebase`);
        }
      } catch (error) {
        console.error('Error fetching from Firebase, falling back to mock data:', error);
        permissions = [...mockPermissions];
      }
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      permissions = [...mockPermissions];
    }

    // Apply additional filters if needed
    if (resource && permissions.length > 0) {
      permissions = permissions.filter(permission => permission.resource === resource);
    }

    return NextResponse.json({
      success: true,
      permissions: permissions,
      count: permissions.length
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, permissionType, resource, grantedBy } = body;

    // Validate required fields
    if (!userId || !userName || !permissionType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userName, permissionType' },
        { status: 400 }
      );
    }

    // Validate permission type
    if (!['admin', 'read', 'write'].includes(permissionType)) {
      return NextResponse.json(
        { error: 'Invalid permission type. Must be admin, read, or write' },
        { status: 400 }
      );
    }

    // Create new permission
    const permissionData = {
      userId,
      userName,
      permissionType: permissionType as 'admin' | 'read' | 'write',
      resource: resource || 'all',
      grantedBy: grantedBy || 'system'
    };

    let newPermission;

    if (isFirebaseConfigured()) {
      // Use Firebase
      newPermission = await permissionsService.add(permissionData);
      console.log(`✅ Permission created in Firebase with ID: ${newPermission.id}`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      newPermission = {
        id: (mockPermissions.length + 1).toString(),
        ...permissionData,
        grantedAt: new Date(),
        expiresAt: undefined,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockPermissions.push(newPermission);
    }

    return NextResponse.json({
      success: true,
      permission: newPermission,
      message: 'Permission created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, permissionType, resource, expiresAt } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Permission ID is required' },
        { status: 400 }
      );
    }

    let updatedPermission;

    if (isFirebaseConfigured()) {
      // Use Firebase
      const existingPermission = await permissionsService.getById(id);
      if (!existingPermission) {
        return NextResponse.json(
          { error: 'Permission not found' },
          { status: 404 }
        );
      }

      // Update permission in Firebase
      await permissionsService.update(id, {
        ...(permissionType && { permissionType: permissionType as 'admin' | 'read' | 'write' }),
        ...(resource && { resource }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) })
      });

      // Get updated permission
      updatedPermission = await permissionsService.getById(id);
      console.log(`✅ Permission updated in Firebase with ID: ${id}`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      const permissionIndex = mockPermissions.findIndex(permission => permission.id === id);
      if (permissionIndex === -1) {
        return NextResponse.json(
          { error: 'Permission not found' },
          { status: 404 }
        );
      }

      updatedPermission = {
        ...mockPermissions[permissionIndex],
        ...(permissionType && { permissionType }),
        ...(resource && { resource }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        updated_at: new Date()
      };

      mockPermissions[permissionIndex] = updatedPermission;
    }

    return NextResponse.json({
      success: true,
      permission: updatedPermission,
      message: 'Permission updated successfully'
    });

  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: 'Failed to update permission' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Handle case where request.url might be undefined in test environment
    let id;
    
    if (!request.url) {
      // In test environment, create a default URL
      const url = 'http://localhost:3000/api/permissions/list';
      const { searchParams } = new URL(url);
      id = searchParams.get('id');
    } else {
      const { searchParams } = new URL(request.url);
      id = searchParams.get('id');
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Permission ID is required' },
        { status: 400 }
      );
    }

    let deletedPermission;

    if (isFirebaseConfigured()) {
      // Use Firebase
      const existingPermission = await permissionsService.getById(id);
      if (!existingPermission) {
        return NextResponse.json(
          { error: 'Permission not found' },
          { status: 404 }
        );
      }

      // Delete permission from Firebase
      await permissionsService.delete(id);
      deletedPermission = existingPermission;
      console.log(`✅ Permission deleted from Firebase with ID: ${id}`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      const permissionIndex = mockPermissions.findIndex(permission => permission.id === id);
      if (permissionIndex === -1) {
        return NextResponse.json(
          { error: 'Permission not found' },
          { status: 404 }
        );
      }

      deletedPermission = mockPermissions.splice(permissionIndex, 1)[0];
    }

    return NextResponse.json({
      success: true,
      permission: deletedPermission,
      message: 'Permission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      { error: 'Failed to delete permission' },
      { status: 500 }
    );
  }
}

