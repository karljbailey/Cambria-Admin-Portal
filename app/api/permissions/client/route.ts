import { NextRequest, NextResponse } from 'next/server';
import { permissionsService } from '@/lib/permissions';
import { usersService } from '@/lib/collections';
import { isFirebaseConfigured } from '@/lib/init';

export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const clientCode = searchParams.get('clientCode');

    if (userId && clientCode) {
      // Get specific client permission for user
      const result = await permissionsService.checkClientPermission(userId, clientCode, 'read');
      return NextResponse.json({
        success: true,
        permission: result
      });
    } else if (userId) {
      // Get all client permissions for user
      const permissions = await permissionsService.getUserClientPermissions(userId);
      return NextResponse.json({
        success: true,
        permissions
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching client permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { userId, clientCode, clientName, permissionType, grantedBy } = body;

    // Validate required fields
    if (!userId || !clientCode || !clientName || !permissionType || !grantedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, clientCode, clientName, permissionType, grantedBy' },
        { status: 400 }
      );
    }

    // Validate permission type
    if (!['read', 'write', 'admin'].includes(permissionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid permission type. Must be read, write, or admin' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await usersService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Add client permission
    const success = await permissionsService.addClientPermission(
      userId,
      clientCode,
      clientName,
      permissionType,
      grantedBy
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Client permission added successfully'
      }, { status: 201 });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to add client permission' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding client permission:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { userId, clientCode, permissionType } = body;

    // Validate required fields
    if (!userId || !clientCode || !permissionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, clientCode, permissionType' },
        { status: 400 }
      );
    }

    // Validate permission type
    if (!['read', 'write', 'admin'].includes(permissionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid permission type. Must be read, write, or admin' },
        { status: 400 }
      );
    }

    // Update client permission
    const success = await permissionsService.updateClientPermission(
      userId,
      clientCode,
      permissionType
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Client permission updated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update client permission' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating client permission:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const clientCode = searchParams.get('clientCode');

    if (!userId || !clientCode) {
      return NextResponse.json(
        { success: false, error: 'User ID and client code are required' },
        { status: 400 }
      );
    }

    // Remove client permission
    const success = await permissionsService.removeClientPermission(userId, clientCode);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Client permission removed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to remove client permission' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error removing client permission:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}



